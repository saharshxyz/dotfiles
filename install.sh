#!/bin/bash

RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
YELLOW=$(tput setaf 3)
RESET=$(tput sgr0)

info() { echo "${GREEN}==> $1${RESET}"; }
warn() { echo "${YELLOW}==> $1${RESET}"; }
error() { echo "${RED}==> $1${RESET}"; }

install_brew() {
  mapfile -t packages <brew/packages.txt
  mapfile -t casks <brew/casks.txt

  if ! command -v brew &>/dev/null; then
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
    info "Homebrew already installed"
  fi

  info "Installing packages..."
  if ! brew install "${packages[@]}"; then
    error "Failed to install some packages"
  fi

  info "Installing casks..."
  if ! brew install --cask "${casks[@]}"; then
    error "Failed to install some casks"
  fi

  info "Cleaning up..."
  brew cleanup
}

create_symlinks() {
  stow_config() {
    local package=$1
    local target=${2:-$HOME}

    info "Stowing $package configuration..."

    mkdir -p "$target" || error "Failed to create target directory: $target" || return 1

    if ! stow --target="$target" "$package"; then
      error "Failed to stow $package configuration"
      return 1
    fi
  }

  if ! command -v stow &>/dev/null; then
    error "stow is required but not installed"
    exit 1
  fi

  info "Creating symbolic links..."

  stow_config "zsh"
  stow_config "git"
  stow_config "nvim" "$HOME/.config/nvim"
  stow_config "yazi" "$HOME/.config/yazi"
  stow_config "ghostty" "$HOME/.config/ghostty"
  stow_config "fastfetch" "$HOME/.config/fastfetch/"
}

main() {
  install_brew

  info "Setting up Go directories..."
  mkdir -p ~/go/{bin,src,pkg}
  warn "Go path: $(go env GOPATH)"

  create_symlinks

  info "Installation complete!"
}

main
