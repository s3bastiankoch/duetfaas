#!/bin/bash

cd ~

# Install git, Go 1.21, make, curl
sudo mkdir -p /etc/apt/sources.list.d
echo "deb http://ftp.debian.org/debian bullseye-backports main" | \
  sudo tee /etc/apt/sources.list.d/bullseye-backports.list
sudo DEBIAN_FRONTEND=noninteractive apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get \
  install --yes \
  golang-1.21 \
  make \
  git \
  curl \
  e2fsprogs \
  util-linux \
  bc \
  gnupg

# Debian's Go 1.21 package installs "go" command under /usr/lib/go-1.21/bin
export PATH=/usr/lib/go-1.21/bin:$PATH

cd ~

# Install Docker CE
# Docker CE includes containerd, but we need a separate containerd binary, built
# in a later step
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo apt-key add -
apt-key finger docker@docker.com | grep '9DC8 5822 9FC7 DD38 854A  E2D8 8D81 803C 0EBF CD88' || echo '**Cannot find Docker key**'
echo "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list
sudo DEBIAN_FRONTEND=noninteractive apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get \
     install --yes \
     docker-ce aufs-tools-
sudo usermod -aG docker $(whoami)

# Install device-mapper
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y dmsetup