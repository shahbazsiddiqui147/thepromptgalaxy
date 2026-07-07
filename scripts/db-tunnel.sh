#!/usr/bin/env bash
# Run this in its own terminal and leave it running while you use `pnpm dev`.
ssh -N -L 5433:127.0.0.1:5432 root@46.250.239.74
