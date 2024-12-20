#!/bin/bash

# Create temporary copies of the original files
cp packages.txt packages.txt.old
cp casks.txt casks.txt.old

# Sort the files in place
sort -u -o packages.txt packages.txt
sort -u -o casks.txt casks.txt

# Show diffs
echo "Changes in packages.txt:"
diff packages.txt.old packages.txt
echo -e "\nChanges in casks.txt:"
diff casks.txt.old casks.txt

# Clean up temporary files
rm packages.txt.old casks.txt.old
