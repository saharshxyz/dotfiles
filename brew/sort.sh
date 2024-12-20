#!/bin/bash

timestamp=$(date +%Y%m%d_%H%M%S)

for file in {packages,casks}.txt; do
  base=${file%.*}
  tmp="/tmp/${base}_${timestamp}.txt"

  cp "$file" "$tmp"
  sort -u -o "$file" "$file"

  echo "Changes from $tmp:"
  diff "$tmp" "$file"
  echo
done
