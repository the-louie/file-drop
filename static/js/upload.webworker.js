// Debug logging helper for web worker
var debugLog = function() {
    // Workers don't have access to URL params, so just check if we should log
    // In production builds, this could be replaced with a no-op function
    // For now, log critical messages only (console.error stays)
    // console.log statements wrapped in debugLog will be silent by default
};

var guid = (function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return function () {
    // Generate proper UUID v4 (RFC 4122)
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // Where 4 is version, y is variant (8, 9, a, or b)
    var uuid = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();

    // Set version to 4 (position 14)
    uuid = uuid.substring(0, 14) + '4' + uuid.substring(15);

    // Set variant bits (position 19: make it 8, 9, a, or b)
    var variantChar = uuid.charAt(19);
    var variantValue = parseInt(variantChar, 16);
    variantValue = (variantValue & 0x3) | 0x8; // Set bits to 10xx
    uuid = uuid.substring(0, 19) + variantValue.toString(16) + uuid.substring(20);

    return uuid;
  };
})();

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(bytes < thresh) return bytes + ' B';
    var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(bytes >= thresh);
    return bytes.toFixed(1)+' '+units[u];
}

var keyStr = "ABCDEFGHIJKLMNOP" +
             "QRSTUVWXYZabcdef" +
             "ghijklmnopqrstuv" +
             "wxyz0123456789+/" +
             "=";

function encode64 (input) {
    input = escape(input);
    var output = "";
    var chr1, chr2, chr3 = "";
    var enc1, enc2, enc3, enc4 = "";
    var i = 0;

    do {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
           enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
           enc4 = 64;
        }

        output = output +
           keyStr.charAt(enc1) +
           keyStr.charAt(enc2) +
           keyStr.charAt(enc3) +
           keyStr.charAt(enc4);
        chr1 = chr2 = chr3 = "";
        enc1 = enc2 = enc3 = enc4 = "";
    } while (i < input.length);

    return output;
}

function uploadChunk (chunk, chunkIndex) {
    // Abort any previous XHR for this chunk (shouldn't happen in sequential mode, but safety check)
    if (self.activeXHRs[chunkIndex]) {
        debugLog("Aborting previous XHR for chunk", chunkIndex);
        self.activeXHRs[chunkIndex].abort();
        self.activeXHRs[chunkIndex] = null;
    }

    var xhr = new XMLHttpRequest();
    self.activeXHRs[chunkIndex] = xhr;

    var handleFailure = function(reason) {
        // Clear the active XHR reference
        self.activeXHRs[chunkIndex] = null;

        self.chunkRetries[chunkIndex]++;
        console.error(reason, "for chunk", chunkIndex, "- retry", self.chunkRetries[chunkIndex], "of", self.MAX_RETRIES);

        if (self.chunkRetries[chunkIndex] >= self.MAX_RETRIES) {
            console.error("Chunk", chunkIndex, "failed after", self.MAX_RETRIES, "retries - aborting upload");
            self.postMessage({
                action:"FAIL",
                fileID:self.currentFileID,
                error: "Upload failed after multiple attempts. Please check your connection and try again."
            });
            return;
        }

        // Reset chunk status to retry
        self.chunkList[chunkIndex] = 0;

        // Retry with exponential backoff
        var retryDelay = Math.min(1000 * Math.pow(2, self.chunkRetries[chunkIndex] - 1), 30000);
        debugLog("Retrying chunk", chunkIndex, "in", retryDelay, "ms");
        setTimeout(function() {
            uploadNextChunk();
        }, retryDelay);
    };

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status != 200) {
                // Try to parse error response for user-friendly message
                var errorReason = "Chunk upload failed with status: " + xhr.status;
                if (xhr.status === 429 || xhr.status === 507) {
                    // Quota exceeded - abort immediately (no retries)
                    var quotaMsg = "Upload limit reached.";
                    try {
                        var errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.error) {
                            quotaMsg = errorResponse.error;
                        }
                    } catch (e) {}

                    self.postMessage({
                        action:"FAIL",
                        fileID:self.currentFileID,
                        error: quotaMsg + " Please try again later."
                    });
                    return false;
                }

                handleFailure(errorReason);
                return false;
            }

            try {
                var replyChunkIndex = parseInt(JSON.parse(xhr.responseText).chunk);

                // Verify server returned the correct chunk index
                if (replyChunkIndex !== chunkIndex) {
                    console.error("Server returned wrong chunk index:", replyChunkIndex, "expected:", chunkIndex);
                    handleFailure("Server returned wrong chunk index");
                    return false;
                }

                // Clear the active XHR reference using the parameter chunkIndex, not server response
                self.activeXHRs[chunkIndex] = null;

                // Only increment chunksSent if this chunk wasn't already completed
                // (handles retry case where chunk might have been counted before)
                if (self.chunkList[chunkIndex] !== 3) {
                    self.chunksSent++;
                }

                self.chunkList[chunkIndex] = 3;
                // Reset retry count on success
                self.chunkRetries[chunkIndex] = 0;

                // Save progress to localStorage for resumable uploads
                try {
                    var progressKey = 'upload_progress_' + self.uuid;
                    var progressData = {
                        uuid: self.uuid,
                        fileName: self.fileName,
                        fileSize: self.blob.size,
                        chunkCount: self.chunkCount,
                        completedChunks: self.chunkList.map(function(status, idx) {
                            return status === 3 ? idx : -1;
                        }).filter(function(idx) { return idx !== -1; }),
                        timestamp: Date.now()
                    };
                    localStorage.setItem(progressKey, JSON.stringify(progressData));
                } catch (storageErr) {
                    // Non-critical - just log if localStorage fails
                    console.warn("Failed to save upload progress:", storageErr);
                }
            } catch (e) {
                handleFailure("Failed to parse chunk response: " + e);
                return false;
            }

            // Upload next chunk sequentially
            uploadNextChunk();
        }
    };

    xhr.upload.onprogress = function(e) {
        // Calculate accurate progress including current chunk's partial progress
        var currentChunkProgress = 0;
        if (e.lengthComputable && e.total > 0) {
            currentChunkProgress = e.loaded / e.total;
        }

        // Total progress = (completed chunks + current chunk progress) / total chunks
        var totalProgress = (self.chunksSent + currentChunkProgress) / self.chunkCount;

        self.postMessage({
            action:"PROGRESS",
            fileID:self.currentFileID,
            sent: totalProgress
        });
    };

    xhr.onerror = function() {
        handleFailure("Network error during chunk upload");
    };

    xhr.ontimeout = function() {
        handleFailure("Timeout during chunk upload");
    };

    xhr.onabort = function() {
        // XHR was aborted - don't treat as failure, just cleanup
        debugLog("XHR aborted for chunk", chunkIndex);
        self.activeXHRs[chunkIndex] = null;
    };

    xhr.open("POST", "/upload?chunkIndex=" + chunkIndex + "&uuid=" + self.uuid);
    xhr.timeout = 300000; // 5 minute timeout per chunk
    self.chunkList[chunkIndex] = 2;
    xhr.send(chunk);
}

function uploadNextChunk() {
    // Check if all chunks are done
    var allDone = true;
    var pendingCount = 0;
    for (var i = 0; i < self.chunkList.length; i++) {
        if (self.chunkList[i] != 3) {
            allDone = false;
            if (self.chunkList[i] === 0) {
                pendingCount++;
            }
        }
    }

    if (allDone) {
        // All chunks uploaded - trigger merge
        debugLog("All chunks uploaded, triggering merge for", self.fileName);

        // Notify UI that merge is starting
        self.postMessage({
            action:"MERGING",
            fileID:self.currentFileID
        });

        var xhrMerge = new XMLHttpRequest();
        var mergeUrl = "/merge?name=" + encodeURIComponent(self.fileName) +
                       "&chunkCount=" + self.chunkCount +
                       "&uuid=" + self.uuid +
                       "&collectionID=" + self.collectionID +
                       "&checksum=" + self.fileChecksum;
        xhrMerge.open("POST", mergeUrl);
        xhrMerge.onreadystatechange = function (e) {
            if (xhrMerge.readyState == 4) {
                if (xhrMerge.status != 200) {
                    console.error("Merge failed with status:", xhrMerge.status);
                    var errorMsg = "Upload failed. Please try again.";

                    // Parse server error message if available
                    try {
                        var errorResponse = JSON.parse(xhrMerge.responseText);
                        if (errorResponse.error) {
                            // Map server errors to user-friendly messages
                            if (xhrMerge.status === 403) {
                                errorMsg = "This file type is not allowed. Please upload a different file.";
                            } else if (xhrMerge.status === 413) {
                                errorMsg = "File is too large. Maximum size allowed is " + humanFileSize(errorResponse.maxSize || 0, true) + ".";
                            } else if (xhrMerge.status === 422) {
                                errorMsg = "File upload corrupted during transfer. Please try again.";
                            } else if (xhrMerge.status === 429) {
                                errorMsg = "Upload limit reached. Please try again later.";
                            } else if (xhrMerge.status === 507) {
                                errorMsg = "Server storage is full. Please contact support.";
                            } else if (xhrMerge.status === 400) {
                                errorMsg = "Invalid file data. Please try again.";
                            } else {
                                errorMsg = errorResponse.error;
                            }
                        }
                    } catch (parseErr) {
                        // Use status-based messages if can't parse response
                        if (xhrMerge.status === 403) {
                            errorMsg = "This file type is not allowed.";
                        } else if (xhrMerge.status === 413) {
                            errorMsg = "File is too large.";
                        } else if (xhrMerge.status === 422) {
                            errorMsg = "File corrupted during upload. Please try again.";
                        } else if (xhrMerge.status === 429) {
                            errorMsg = "Upload limit reached. Try again later.";
                        } else if (xhrMerge.status === 507) {
                            errorMsg = "Server storage is full.";
                        }
                    }

                    self.postMessage({action:"FAIL", fileID:self.currentFileID, error: errorMsg});
                } else {
                    // report back that upload of file was successful!
                    try {
                        var response = JSON.parse(xhrMerge.responseText);

                        // Clear upload progress from localStorage on success
                        try {
                            var progressKey = 'upload_progress_' + self.uuid;
                            localStorage.removeItem(progressKey);
                        } catch (storageErr) {
                            console.warn("Failed to clear upload progress:", storageErr);
                        }

                        self.postMessage({action:"SUCCESS", fileID:self.currentFileID, fileName:response.fileName});
                    } catch (e) {
                        console.error("Failed to parse merge response:", e);
                        self.postMessage({
                            action:"FAIL",
                            fileID:self.currentFileID,
                            error: "Server error. Please try again."
                        });
                    }
                }
            }
        };

        xhrMerge.onerror = function() {
            console.error("Network error during merge");
            self.postMessage({
                action:"FAIL",
                fileID:self.currentFileID,
                error: "Network error. Please check your connection and try again."
            });
        };

        xhrMerge.ontimeout = function() {
            console.error("Timeout during merge");
            self.postMessage({
                action:"FAIL",
                fileID:self.currentFileID,
                error: "Upload took too long. Try a smaller file or check your connection."
            });
        };

        xhrMerge.timeout = 60000; // 1 minute timeout for merge
        xhrMerge.send();
        return;
    }

    // Find next chunk to upload (status 0 = not started)
    for (var i = 0; i < self.chunkList.length; i++) {
        if (self.chunkList[i] === 0) {
            var start = i * self.BYTES_PER_CHUNK;
            var end = Math.min(start + self.BYTES_PER_CHUNK, self.blob.size);
            var chunk = self.blob.slice(start, end);
            uploadChunk(chunk, i);
            return;
        }
    }

    // Edge case: No chunks with status 0, but not all done (chunks in status 2)
    // This means a chunk is currently uploading, so we wait
    if (!allDone && pendingCount === 0) {
        debugLog("Waiting for chunk in progress...");
    }
}

self.onmessage = function(e) {
    self.BYTES_PER_CHUNK = 1024 * 1024 * 2; // 2MB chunks
    self.blob = e.data.file;

    self.chunksSent = 0;
    self.chunkCount = Math.ceil(self.blob.size / self.BYTES_PER_CHUNK);
    self.fileName = self.blob.name;
    self.collectionID = e.data.collectionID;
    self.uuid = guid();
    self.currentFileID = e.data.fileID;
    self.chunkList = Array(self.chunkCount);
    self.chunkRetries = Array(self.chunkCount); // Track retry count per chunk
    self.activeXHRs = Array(self.chunkCount); // Track active XHR per chunk
    self.MAX_RETRIES = 10;
    self.fileChecksum = null; // Will store SHA-256 checksum of file

    // Initialize all chunks to 0 (not started) and retries to 0
    for (var i = 0; i < self.chunkCount; i++) {
        self.chunkList[i] = 0;
        self.chunkRetries[i] = 0;
        self.activeXHRs[i] = null;
    }

    // Calculate file checksum before uploading for integrity verification
    debugLog("Calculating file checksum for integrity verification...");
    self.blob.arrayBuffer().then(function(buffer) {
        return crypto.subtle.digest('SHA-256', buffer);
    }).then(function(hashBuffer) {
        // Convert hash to hex string
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        self.fileChecksum = hashArray.map(function(b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
        debugLog("File checksum calculated:", self.fileChecksum);

        // Start uploading the first chunk
        uploadNextChunk();
    }).catch(function(err) {
        console.error("Failed to calculate file checksum:", err);
        self.postMessage({
            action:"FAIL",
            fileID:self.currentFileID,
            error: "Failed to calculate file checksum. Please try again."
        });
    });
};
