// Debug mode: disabled by default (production), enable via ?debug=1 or localStorage
var debug = (function() {
    try {
        return (window.location.search.indexOf('debug=1') !== -1) ||
               (localStorage.getItem('debug') === 'true');
    } catch (e) {
        return false;
    }
})();

// Debug logging helper - only logs when debug mode enabled
var debugLog = function() {
    if (debug) {
        console.log.apply(console, arguments);
    }
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

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

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

function relativeTime(unixTimestamp) {
    var now = Math.floor(Date.now() / 1000);
    var diff = now - unixTimestamp;

    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
    if (diff < 604800) return Math.floor(diff / 86400) + ' days ago';
    if (diff < 2592000) return Math.floor(diff / 604800) + ' weeks ago';
    return Math.floor(diff / 2592000) + ' months ago';
}

(function (window) {
    //"use strict";

    var document = window.document;

    document.addEventListener('DOMContentLoaded', function () {

    // Check for incomplete uploads in localStorage and offer resume
    function checkIncompleteUploads() {
        try {
            var incompleteUploads = [];
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.startsWith('upload_progress_')) {
                    try {
                        var data = JSON.parse(localStorage.getItem(key));
                        // Check if upload is older than 24 hours (stale)
                        if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                            localStorage.removeItem(key); // Remove stale uploads
                        } else {
                            incompleteUploads.push(data);
                        }
                    } catch (e) {
                        // Invalid data, remove it
                        localStorage.removeItem(key);
                    }
                }
            }

            if (incompleteUploads.length > 0) {
                debugLog("Found", incompleteUploads.length, "incomplete uploads");
                // Note: Full resume implementation would show UI to let user resume
                // For now, just log (can be extended in future)
            }
        } catch (e) {
            debugLog("Failed to check incomplete uploads:", e);
        }
    }

    // Check for incomplete uploads on page load
    checkIncompleteUploads();

    // Modern clipboard API function
    var copyToClipboard = function(text, buttonElement) {
        debugLog('Attempting to copy:', text);
        debugLog('Secure context:', window.isSecureContext);
        debugLog('Clipboard API available:', !!navigator.clipboard);

        if (navigator.clipboard && window.isSecureContext) {
            debugLog('Using modern Clipboard API');
            // Use modern Clipboard API
            navigator.clipboard.writeText(text).then(function() {
                debugLog('Clipboard API copy successful');
                buttonElement.value = 'copied';
                buttonElement.disabled = true;
                setTimeout(function() {
                    buttonElement.value = 'copy';
                    buttonElement.disabled = false;
                }, 2000);
            }).catch(function(err) {
                console.error('Clipboard API failed:', err);
                debugLog('Falling back to execCommand method');
                fallbackCopyTextToClipboard(text, buttonElement);
            });
        } else {
            if (!window.isSecureContext) {
                debugLog('Not in secure context (HTTPS required for Clipboard API)');
            }
            if (!navigator.clipboard) {
                debugLog('Clipboard API not available');
            }
            debugLog('Using fallback method');
            fallbackCopyTextToClipboard(text, buttonElement);
        }
    };

    // Fallback copy function for older browsers
    var fallbackCopyTextToClipboard = function(text, buttonElement) {
        debugLog('Using fallback clipboard method');
        var textArea = document.createElement("textarea");
        textArea.value = text;

        // Make textarea visible but off-screen
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        textArea.style.width = "1px";
        textArea.style.height = "1px";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        // Use setSelectionRange for better compatibility
        try {
            textArea.setSelectionRange(0, 99999);
        } catch (e) {
            debugLog('setSelectionRange not supported, using select()');
        }

        try {
            var successful = document.execCommand('copy');
            debugLog('Fallback copy result:', successful);
            if (successful) {
                buttonElement.value = 'copied';
                buttonElement.disabled = true;
                setTimeout(function() {
                    buttonElement.value = 'copy';
                    buttonElement.disabled = false;
                }, 2000);
            } else {
                console.error('Fallback: document.execCommand("copy") returned false');
                buttonElement.value = 'Copy failed';

                // Add toast notification
                var toast = document.createElement('div');
                toast.className = 'copy-toast';
                toast.textContent = "Couldn't automatically copy the url, please copy manually";
                toast.style.position = 'fixed';
                toast.style.top = '20px';
                toast.style.right = '20px';
                toast.style.background = '#ffc107';
                toast.style.color = '#000';
                toast.style.padding = '10px 15px';
                toast.style.borderRadius = '4px';
                toast.style.zIndex = '9999';
                toast.style.maxWidth = '300px';
                toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                toast.style.fontFamily = 'Arial, sans-serif';
                toast.style.fontSize = '14px';
                document.body.appendChild(toast);

                // Make the textbox more prominent to guide user
                var textbox = buttonElement.parentElement.querySelector('.resulttextbox');
                if (textbox) {
                    textbox.style.backgroundColor = '#fff3cd';
                    textbox.style.border = '2px solid #ffc107';
                    textbox.style.fontWeight = 'bold';
                }

                setTimeout(function() {
                    buttonElement.value = 'copy';
                    if (textbox) {
                        textbox.style.backgroundColor = '';
                        textbox.style.border = '';
                        textbox.style.fontWeight = '';
                    }
                    toast.style.opacity = '0';
                    toast.style.transition = 'opacity 0.3s';
                    setTimeout(function() { toast.remove(); }, 300);
                }, 4000); // Longer timeout to give user time to see the instruction
            }
        } catch (err) {
            console.error('Fallback: document.execCommand("copy") failed:', err);
            buttonElement.value = 'Copy failed';

            // Add toast notification
            var toast = document.createElement('div');
            toast.className = 'copy-toast';
            toast.textContent = "Couldn't automatically copy the url, please copy manually";
            toast.style.position = 'fixed';
            toast.style.top = '20px';
            toast.style.right = '20px';
            toast.style.background = '#ffc107';
            toast.style.color = '#000';
            toast.style.padding = '10px 15px';
            toast.style.borderRadius = '4px';
            toast.style.zIndex = '9999';
            toast.style.maxWidth = '300px';
            toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            toast.style.fontFamily = 'Arial, sans-serif';
            toast.style.fontSize = '14px';
            document.body.appendChild(toast);

            // Make the textbox more prominent to guide user
            var textbox = buttonElement.parentElement.querySelector('.resulttextbox');
            if (textbox) {
                textbox.style.backgroundColor = '#fff3cd';
                textbox.style.border = '2px solid #ffc107';
                textbox.style.fontWeight = 'bold';
            }

            setTimeout(function() {
                buttonElement.value = 'copy';
                if (textbox) {
                    textbox.style.backgroundColor = '';
                    textbox.style.border = '';
                    textbox.style.fontWeight = '';
                }
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(function() { toast.remove(); }, 300);
            }, 4000); // Longer timeout to give user time to see the instruction
        }

        document.body.removeChild(textArea);
    };

    var allFiles = [],
        currentFileID = 0,
        locked = false,
        prevCountFiles = 0,
        waiting = 0,
        uuid = guid(),
        uuidurl = String(window.location.origin+'/?c='+uuid),
        dropzone,
        uploadsInProgress = false,
        uploadWorker = null; // Reusable worker for all uploads

    // Function to get or create upload worker
    function getUploadWorker() {
        if (!uploadWorker) {
            uploadWorker = new Worker("/js/upload.webworker.js");
        }
        return uploadWorker;
    }

    var noopHandler = function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
    };

    // Add beforeunload warning for active uploads
    function setupUploadWarning() {
        window.addEventListener('beforeunload', function(e) {
            if (uploadsInProgress) {
                var message = 'You have uploads in progress. Are you sure you want to leave?';
                e.returnValue = message; // For Chrome
                return message; // For other browsers
            }
        });
    }

    // Initialize the upload warning
    setupUploadWarning();

    // Fetch and display quota information
    function loadQuotaInfo() {
        fetch('/api/quota')
            .then(function(response) {
                if (!response.ok) throw new Error('Failed to fetch quota');
                return response.json();
            })
            .then(function(data) {
                if (data && data.enabled) {
                    var quotaText = '';
                    var isWarning = false;

                    if (data.perIP && data.perIP.bytesLimit) {
                        var used = humanFileSize(data.perIP.bytesUsed || 0, true);
                        var limit = humanFileSize(data.perIP.bytesLimit, true);
                        var percentUsed = ((data.perIP.bytesUsed || 0) / data.perIP.bytesLimit) * 100;
                        quotaText += 'Daily storage: <strong>' + used + ' / ' + limit + '</strong>';
                        if (percentUsed > 90) isWarning = true;
                    }

                    if (data.perIP && data.perIP.filesLimit) {
                        if (quotaText) quotaText += ' &nbsp;|&nbsp; ';
                        var filesUsed = data.perIP.filesUsed || 0;
                        var filesLimit = data.perIP.filesLimit;
                        var filesPercent = (filesUsed / filesLimit) * 100;
                        quotaText += 'Daily files: <strong>' + filesUsed + ' / ' + filesLimit + '</strong>';
                        if (filesPercent > 90) isWarning = true;
                    }

                    if (data.global && data.global.limit) {
                        if (quotaText) quotaText += ' &nbsp;|&nbsp; ';
                        var globalUsed = humanFileSize(data.global.used || 0, true);
                        var globalLimit = humanFileSize(data.global.limit, true);
                        quotaText += 'Server: <strong>' + globalUsed + ' / ' + globalLimit + '</strong>';
                    }

                    if (quotaText) {
                        var quotaHtml = quotaText;
                        if (isWarning) {
                            quotaHtml = '<span class="quota-warning">⚠ Approaching limit: </span>' + quotaText;
                        }
                        var quotaInfo = document.getElementById('quota-info');
                        if (quotaInfo) {
                            quotaInfo.innerHTML = quotaHtml;
                            quotaInfo.style.display = 'block';
                        }
                    }
                }
            })
            .catch(function(err) {
                debugLog('Failed to load quota info:', err);
            });
    }

    function handleNewFiles(files) {
        var count = files.length;
        if (count > 0) {
            prevCountFiles = allFiles.length;
            //if (document.getElementById("dropzoneLabel")) { document.getElementById("dropzone").innerHTML = ''; }

            // Remove additional upload section when new files are added
            var additionalSection = document.getElementById('additional-upload-section');
            if (additionalSection) {
                additionalSection.remove();
            }

            var dropzoneElement = document.getElementById("dropzone");
            if (!dropzoneElement) return;

            for (var i = prevCountFiles + waiting, j = 0;
                i < prevCountFiles + files.length + waiting;
                i++, j++ ) {
                var fileDiv = document.createElement('div');
                fileDiv.className = 'file file-' + i;
                fileDiv.style.position = 'relative';
                fileDiv.innerHTML =
                    '<span class="progressbar"></span>' +
                    '<div class="name"></div>' +
                    '<div class="progress">' +
                        '<input style="width: 800px;" class="resulttextbox" type="text" value="Waiting..." disabled />' +
                        '<input style="width:65px;" class="resultcopy" type="button" value="..." DISABLED/>' +
                        '<input style="width:35px;display:none" class="resultcopyall" type="button" value="" />' +
                    '</div>';
                dropzoneElement.appendChild(fileDiv);

                var nameElement = fileDiv.querySelector(".name");
                if (nameElement) {
                    nameElement.textContent = files[j].name;
                }
            }
            dropzoneElement.scrollTop = dropzoneElement.scrollHeight;
            waiting += count;
            if (!locked) {
                waiting -= count;
                allFiles.push.apply(allFiles, files);
                uploadsInProgress = true; // Set flag when uploads start
                handleNextFile();
            }
        }
    }

    // change the apperance of the bar when the file upload is successful
    function uploadFinish(fileName, currentFileID) {
        //var url = String(window.location.href+'/d/'+fileName.replace(/^\.\//,'')).replace(/([^:])\/\//,'$1/');
        var url = String(window.location.origin+'/d/'+fileName);

        var fileElement = document.querySelector(".file-" + currentFileID);
        if (!fileElement) return false;

        fileElement.style.backgroundColor = '#ADA';

        var textbox = fileElement.querySelector(".progress .resulttextbox");
        if (textbox) {
            textbox.value = url;
        }

        var nameElement = fileElement.querySelector(".name");
        if (nameElement) {
            var currentName = nameElement.textContent || nameElement.innerHTML;
            nameElement.innerHTML = "<a href='"+url+"'>"+ currentName +"</a>";
        }

        var inputs = fileElement.querySelectorAll(".progress input");
        inputs.forEach(function(input) {
            input.removeAttribute('disabled');
        });

        var copyButton = fileElement.querySelector(".progress .resultcopy");
        if (copyButton) {
            copyButton.value = 'copy';
            copyButton.removeAttribute('disabled');

            // Add click handler for modern clipboard API (use named function to avoid duplicates)
            if (!copyButton.dataset.listenerAttached) {
                copyButton.dataset.listenerAttached = 'true';
                copyButton.addEventListener('click', function() {
                    copyToClipboard(url, copyButton);
                });
            }
        }

        return true;
    }


    // this code handles people who use the file selector
    // instead of dropping the files.
    var fileInput = document.querySelector("input[type=file]");
    if (fileInput) {
        fileInput.addEventListener("change", function(evt) {
            handleNewFiles(evt.target.files);
        });
    }

    // Drag counter to handle nested drag events
    var dragCounter = 0;

    // this code handles people who drop the files instead
    // or using the button
    function drop(evt) {
        noopHandler(evt);
        dragCounter = 0;
        var dropzone = document.getElementById("dropzone");
        if (dropzone) {
            dropzone.classList.remove('drag-active');
        }
        handleNewFiles(evt.dataTransfer.files);
    }

    function dragEnterHandler(evt) {
        noopHandler(evt);
        dragCounter++;
        var dropzone = document.getElementById("dropzone");
        if (dropzone) {
            dropzone.classList.add('drag-active');
        }
    }

    function dragLeaveHandler(evt) {
        noopHandler(evt);
        dragCounter--;
        if (dragCounter === 0) {
            var dropzone = document.getElementById("dropzone");
            if (dropzone) {
                dropzone.classList.remove('drag-active');
            }
        }
    }

    // Function to show additional upload option when all files are done
    function showAdditionalUploadOption() {
        // Check if the additional upload section already exists
        if (!document.getElementById('additional-upload-section')) {
            var additionalSection = document.createElement('div');
            additionalSection.id = 'additional-upload-section';
            additionalSection.style.height = '144px';
            additionalSection.style.backgroundColor = '#f8f9fa';
            additionalSection.style.border = '2px dashed #bdb';
            additionalSection.style.borderRadius = '8px';
            additionalSection.style.marginTop = '20px';
            additionalSection.style.display = 'flex';
            additionalSection.style.alignItems = 'center';
            additionalSection.style.justifyContent = 'center';
            additionalSection.style.textAlign = 'center';
            additionalSection.style.color = '#8c8';
            additionalSection.style.fontFamily = 'Arial, sans-serif';
            additionalSection.style.fontSize = '0.9em';
            additionalSection.style.cursor = 'pointer';
            additionalSection.innerHTML = '<div>Want to upload more files?<br/>Drop files here to add more</div>';

            var dropzoneElement = document.getElementById("dropzone");
            if (dropzoneElement) {
                dropzoneElement.appendChild(additionalSection);
            }

            // Make the additional section a drop zone
            additionalSection.addEventListener("dragenter", dragEnterHandler);
            additionalSection.addEventListener("dragleave", dragLeaveHandler);
            additionalSection.addEventListener("dragexit", dragLeaveHandler);
            additionalSection.addEventListener("dragover", noopHandler);
            additionalSection.addEventListener("drop", function(evt) {
                noopHandler(evt);
                dragCounter = 0;
                var dropzone = document.getElementById("dropzone");
                if (dropzone) {
                    dropzone.classList.remove('drag-active');
                }
                handleNewFiles(evt.dataTransfer.files);
            });
        }
    }

    /*
    Improved version with chunked uploading for large files
    */
    function handleNextFile() {
        if (currentFileID >= allFiles.length) {
            locked = false;
            uploadsInProgress = false; // Reset flag when all uploads complete
            // All files uploaded - show additional upload option
            showAdditionalUploadOption();
        } else {
            if (!allFiles[currentFileID].size || allFiles[currentFileID].size <= 0) {
              locked = false;
              var fileElement = document.querySelector(".file-" + currentFileID);
              if (fileElement) {
                  var progressbar = fileElement.querySelector(".progressbar");
                  if (progressbar) progressbar.style.display = "none";
                  fileElement.style.backgroundColor = '#DAA';
                  var textbox = fileElement.querySelector(".progress .resulttextbox");
                  if (textbox) textbox.value = 'Empty or invalid file.';
              }
              allFiles[currentFileID] = 1; // Mark as processed
              currentFileID++;
              handleNextFile(); // Continue to next file or completion
              return false;
            }

            locked = true;
            var blob = allFiles[currentFileID];
            var worker = getUploadWorker(); // Reuse worker instead of creating new one
            var msg = {file: blob, fileID: currentFileID, collectionID: uuid};
            worker.postMessage(msg);
            var dropzoneLabel = document.getElementById("dropzoneLabel");
            if (dropzoneLabel) dropzoneLabel.style.display = 'none';

            worker.onmessage = function(e) {
                var fileElement = document.querySelector(".file-" + currentFileID);
                if (!fileElement) {
                    // Don't terminate - keep worker for next file
                    return;
                }

                if (e.data.action == 'SUCCESS') {
                    if(allFiles.length > 1) {
                        var collection = document.querySelector(".collection");
                        if (collection) collection.style.display = "block";
                    }
                    var progressbar = fileElement.querySelector(".progressbar");
                    if (progressbar) progressbar.style.display = "none";
                    var mergingStatus = fileElement.querySelector(".merging-status");
                    if (mergingStatus) mergingStatus.remove();
                    uploadFinish(e.data.fileName, currentFileID);
                    loadQuotaInfo(); // Update quota display after successful upload
                    allFiles[currentFileID] = 1;
                    currentFileID++;
                    // Don't terminate worker - reuse for next file
                    handleNextFile();
                } else if (e.data.action == 'FAIL') {
                    locked = false;
                    var progressbar = fileElement.querySelector(".progressbar");
                    if (progressbar) {
                        progressbar.style.opacity = "0.5";
                        progressbar.style.backgroundColor = "#DDD";
                    }
                    fileElement.style.backgroundColor = '#DAA';
                    var mergingStatus = fileElement.querySelector(".merging-status");
                    if (mergingStatus) mergingStatus.remove();

                    // Display specific error message if available
                    var errorMessage = e.data.error || 'Upload failed.';
                    var textbox = fileElement.querySelector(".progress .resulttextbox");
                    if (textbox) textbox.value = errorMessage;

                    allFiles[currentFileID] = 1;
                    currentFileID++;

                    // On error, terminate and recreate worker for next file to ensure clean state
                    if (uploadWorker) {
                        uploadWorker.terminate();
                        uploadWorker = null;
                    }

                    handleNextFile();
                    return false;
                } else if (e.data.action == 'MERGING') {
                    // Show merge in progress
                    var progressbar = fileElement.querySelector(".progressbar");
                    if (progressbar) {
                        progressbar.style.width = "100%";
                        progressbar.style.backgroundColor = "#9C9";
                    }
                    var mergingDiv = document.createElement('div');
                    mergingDiv.className = 'merging-status';
                    mergingDiv.textContent = 'Processing file...';
                    fileElement.insertBefore(mergingDiv, fileElement.firstChild);
                } else if (e.data.action == 'PROGRESS') {
                    var progressbar = fileElement.querySelector(".progressbar");
                    if (progressbar) {
                        progressbar.style.width = (100*e.data.sent) + "%";
                    }
                }
            };
        }
    }


    if (getUrlVars().c) {
        var dropzoneLabel = document.getElementById("dropzoneLabel");
        if (dropzoneLabel) dropzoneLabel.style.display = 'none';
        uploadsInProgress = false; // Reset flag for collection view
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET","/c/"+getUrlVars().c,true);
        xmlhttp.onreadystatechange=function() {
            if (xmlhttp.readyState==4) {
                var dropzoneDiv = document.getElementById("dropzone");
                if (!dropzoneDiv) return;

                if (xmlhttp.status==200) {
                    try {
                        var responses = JSON.parse(xmlhttp.responseText);

                        for (var r in responses) {
                            var response = responses[r];
                            var url = String(window.location.origin+'/d/'+response.sha);
                            var fileInfo = humanFileSize(response.fileSize, false);
                            if (response.timestamp) {
                                fileInfo += ' • ' + relativeTime(response.timestamp);
                            }

                            var fileDiv = document.createElement('div');
                            fileDiv.className = 'file file-' + r;
                            fileDiv.style.position = 'relative';
                            fileDiv.innerHTML =
                                '<span class="progressbar"></span>' +
                                '<div class="name"><a href="' + url + '">' + response.fileName + '</a> <span style="color:#999;">(' + fileInfo + ')</span></div>' +
                                '<div class="progress">' +
                                    '<input style="width: 800px;" class="resulttextbox" type="text" value="'+url+'" disabled />' +
                                    '<input style="width:65px;" class="resultcopy" type="button" value="copy"/>' +
                                    '<input style="width:35px;display:none" class="resultcopyall" type="button" value="" />' +
                                '</div>';
                            dropzoneDiv.appendChild(fileDiv);

                            // Add click handler for modern clipboard API
                            // Use closure to capture the specific URL for this button
                            (function(specificUrl, fileElement) {
                                var copyButton = fileElement.querySelector('.progress .resultcopy');
                                if (copyButton) {
                                    copyButton.addEventListener('click', function() {
                                        copyToClipboard(specificUrl, copyButton);
                                    });
                                }
                            })(url, fileDiv);
                        }
                    } catch (e) {
                        console.error("Failed to parse collection response:", e);
                        dropzoneDiv.innerHTML = '<div style="color:#c85;padding:20px;">Failed to load collection. Please try again.</div>';
                    }
                } else {
                    // Handle error responses
                    console.error("Failed to load collection, status:", xmlhttp.status);
                    dropzoneDiv.innerHTML = '<div style="color:#c85;padding:20px;">Collection not found.</div>';
                }
            }
        };
    xmlhttp.send();

    } else {
        uploadsInProgress = false; // Reset flag for fresh page load

        // Attach drag events to dropzone
        var dropzoneElement = document.getElementById("dropzone");
        if (dropzoneElement) {
            dropzoneElement.addEventListener("dragenter", dragEnterHandler, false);
            dropzoneElement.addEventListener("dragleave", dragLeaveHandler, false);
            dropzoneElement.addEventListener("dragover", noopHandler, false);
            dropzoneElement.addEventListener("drop", drop, false);
        }
    }

    var collectionDiv = document.createElement('div');
    collectionDiv.className = 'collection';
    collectionDiv.style.position = 'relative';
    collectionDiv.style.display = 'none';
    collectionDiv.innerHTML =
        '<div class="name"><a href="'+uuidurl+'">Collection URL</a></div>' +
        '<input style="width: 800px;" class="resulttextbox" type="text" value="'+uuidurl+'" />' +
        '<input style="width:65px;" class="resultcopy" type="button" value="copy"/>' +
        '<input style="width:35px;display:none" class="resultcopyall" type="button" value="" />';
    var dropzoneElement = document.getElementById("dropzone");
    if (dropzoneElement) {
        dropzoneElement.appendChild(collectionDiv);
    }

    // Add click handler for collection URL copy
    var collectionCopyButton = collectionDiv.querySelector('.resultcopy');
    if (collectionCopyButton) {
        collectionCopyButton.addEventListener('click', function() {
            copyToClipboard(uuidurl, collectionCopyButton);
        });
    }

    // Fetch and display version
    function loadVersion() {
        fetch('/api/version')
            .then(function(response) {
                if (!response.ok) return;
                return response.json();
            })
            .then(function(data) {
                if (data && data.version) {
                    var versionElement = document.getElementById('version');
                    if (versionElement) {
                        versionElement.textContent = 'v' + data.version;
                    }
                }
            })
            .catch(function(error) {
                debugLog('Failed to fetch version:', error);
            });
    }

    // Load version and quota on page load (if not collection view)
    loadVersion();
    if (!getUrlVars().c) {
        loadQuotaInfo();
    }

  });

}(window));
