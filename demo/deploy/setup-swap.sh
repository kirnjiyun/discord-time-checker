#!/usr/bin/env bash
set -euo pipefail

SWAP_SIZE_MB=2048
SWAP_FILE=/swapfile

if swapon --show | grep -q "$SWAP_FILE"; then
  echo "Swap already active at $SWAP_FILE"
  exit 0
fi

if [ ! -f "$SWAP_FILE" ]; then
  sudo fallocate -l "${SWAP_SIZE_MB}M" "$SWAP_FILE" || sudo dd if=/dev/zero of="$SWAP_FILE" bs=1M count="$SWAP_SIZE_MB"
  sudo chmod 600 "$SWAP_FILE"
  sudo mkswap "$SWAP_FILE"
fi

sudo swapon "$SWAP_FILE"

if ! grep -q "^$SWAP_FILE " /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab
fi

echo "Swap enabled:"
swapon --show
