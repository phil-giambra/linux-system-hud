#!/usr/bin/env bash

# This script will install liunx-system-hud for local development and use
# in the current working directory

mkdir lshud
cd lshud

git clone https://github.com/phil-giambra/linux-system-hud.git
git clone https://github.com/phil-giambra/lshud-shared.git
git clone https://github.com/phil-giambra/lshud-settings.git
git clone https://github.com/phil-giambra/lshud-volume.git
git clone https://github.com/phil-giambra/lshud-template.git

# link each hud globally
cd lshud-shared
npm link

cd ../lshud-settings
npm link

cd ../lshud-volume
npm link

# link each hud to linux-system-hud
cd ../linux-system-hud
npm link lshud-shared
npm link lshud-settings
npm link lshud-volume

echo "Install complete"
echo "Use 'npm start' in the linux-system-hud/ folder to run"
echo "After first run see config folder at '$HOME/.linux-system-hud/'"
