# Linux CLI Tool Installation

Command-line upload tool for Linux with subcommands for file upload and screenshots.

## Prerequisites

### Python 3.8+
```bash
# Debian/Ubuntu
sudo apt install python3 python3-pip

# Fedora
sudo dnf install python3 python3-pip

# Arch
sudo pacman -S python python-pip
```

### Python Dependencies
```bash
cd /path/to/file-drop
pip3 install --user -r tools/requirements.txt
```

### Screenshot Tools (install at least one)
```bash
# GNOME Screenshot (recommended for GNOME desktop)
sudo apt install gnome-screenshot

# scrot (lightweight, works everywhere)
sudo apt install scrot

# maim (modern, feature-rich)
sudo apt install maim

# ImageMagick (if you already have it)
sudo apt install imagemagick
```

### Clipboard Support (optional but recommended)
```bash
# xclip (recommended)
sudo apt install xclip

# or xsel
sudo apt install xsel
```

## Installation

### 1. Copy Script to User Bin

```bash
mkdir -p ~/.local/bin
cp tools/linux/fd ~/.local/bin/
chmod +x ~/.local/bin/fd
```

### 2. Add to PATH

If `~/.local/bin` is not in your PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

For other shells:
- **zsh:** `~/.zshrc`
- **fish:** `~/.config/fish/config.fish`

### 3. First Run Configuration

```bash
fd config
# Enter your server URL when prompted

fd login
# Enter username and password
```

## Usage

### Upload Files

```bash
# Single file
fd upload photo.jpg

# Multiple files as collection
fd upload *.png
fd upload document.pdf presentation.pptx data.csv

# With globbing
fd upload ~/Downloads/*.jpg
```

### Screenshot and Upload

```bash
fd screenshot
# Select screen area with mouse
# URL automatically copied to clipboard
```

### Manage Configuration

```bash
# Configure server URL
fd config

# Show current configuration
fd config --show

# Re-authenticate
fd login
```

## Keyboard Shortcuts

Add screenshot shortcut to your desktop environment:

### GNOME/Ubuntu
1. **Settings** → **Keyboard** → **Keyboard Shortcuts** → **Custom Shortcuts**
2. Click **+** to add new shortcut
3. **Name:** `Upload Screenshot`
4. **Command:** `/home/YOUR_USERNAME/.local/bin/fd screenshot`
5. **Shortcut:** Click and press `Ctrl+Shift+U` (or your preference)

### KDE Plasma
1. **System Settings** → **Shortcuts** → **Custom Shortcuts**
2. **Edit** → **New** → **Global Shortcut** → **Command/URL**
3. **Trigger:** `Ctrl+Shift+U`
4. **Action:** `/home/YOUR_USERNAME/.local/bin/fd screenshot`

### i3/sway
Add to config file (`~/.config/i3/config` or `~/.config/sway/config`):
```
bindsym $mod+Shift+u exec /home/YOUR_USERNAME/.local/bin/fd screenshot
```

## Features

- Long-lived authentication (1 year sessions)
- SHA-256 checksum verification
- Automatic retry on network failures (up to 10 attempts)
- Progress bars for large uploads
- Clipboard integration (xclip/xsel)
- Collection support for multiple files
- Auto-detection of screenshot tools
- User-friendly error messages

## Examples

```bash
# Upload vacation photos as collection
fd upload ~/Pictures/vacation/*.jpg

# Quick screenshot share
fd screenshot

# Upload and share immediately
fd upload report.pdf && xdg-open $(pbpaste)

# Batch upload
find ~/Documents -name "*.pdf" -exec fd upload {} \;
```

## Session Management

Sessions are stored in `~/.filedrop/session.json` and last 1 year.

**View session info:**
```bash
cat ~/.filedrop/session.json
# Shows: {"token": "...", "expires_at": 1766000000}
```

**Clear session (logout):**
```bash
rm ~/.filedrop/session.json
```

**Re-authenticate:**
```bash
fd login
```

## Troubleshooting

### Command not found
Ensure `~/.local/bin` is in your PATH:
```bash
echo $PATH | grep .local/bin
# If nothing, add to ~/.bashrc as shown in installation
```

### "requests library not found"
Install dependencies:
```bash
pip3 install --user requests
```

### "No screenshot tool found"
Install at least one screenshot tool:
```bash
sudo apt install gnome-screenshot scrot
```

### "Authentication failed"
Check server URL configuration:
```bash
fd config --show
# Verify URL is correct
```

### Clipboard not working
Install clipboard tool:
```bash
sudo apt install xclip
```

### Permission denied
Make script executable:
```bash
chmod +x ~/.local/bin/fd
```

### Debug mode
Run with `-h` for help:
```bash
fd upload -h
fd screenshot -h
```

For detailed debugging, edit `tools/lib/filedrop_client.py` and add print statements.

## Advanced Usage

### Change Server URL
```bash
fd config
# Enter new server URL
```

### Upload with custom naming
The server generates unique names automatically. To see the generated URL:
```bash
url=$(fd upload file.txt | tail -1)
echo "File available at: $url"
```

### Integration with other tools

**Upload clipboard screenshot (using scrot):**
```bash
alias scrotup='scrot -s /tmp/scrot.png && fd upload /tmp/scrot.png && rm /tmp/scrot.png'
```

**File manager integration (Thunar):**
1. Edit → Configure custom actions
2. Name: "Upload to File Drop"
3. Command: `fd upload %F`

**File manager integration (Nautilus):**
Create `~/.local/share/nautilus/scripts/Upload to File Drop`:
```bash
#!/bin/bash
fd upload "$@"
```

## Configuration Reference

**Config file:** `~/.filedrop/config`
- Contains server URL
- Plain text file

**Session file:** `~/.filedrop/session.json`
- Contains session token and expiry
- Permissions: 600 (read/write for owner only)
- Auto-created on first login
- Valid for 1 year

## Uninstall

```bash
rm ~/.local/bin/fd
rm -rf ~/.filedrop
```

---

**See also:** [tools/README.md](../README.md) for overview of all platform tools.

