#!/bin/sh
# Check this R package for upload to CRAN.
# Don't forget to set the version in the DESCRIPTION file!
Rscript -e "roxygen2::roxygenize()"
npm run prepare
version=$(awk '$1=="Version:" {print $2}' < DESCRIPTION)
if [ -z "${version}" ]
then
echo "Error, could not discern version from DESCRIPTION file"
exit 2
fi
package=$(awk '$1=="Package:" {print $2}' < DESCRIPTION)
file="${package}_${version}.tar.gz"
if [ -e ${file} ]
then
rm ${file}
fi
R CMD build .
if [ -e ${file} ]
then
ls -l --time-style "+%Y-%m-%d,%H:%M" ${file} | awk '{print "Checking " $7 " built at " $6}'
_R_CHECK_FORCE_SUGGESTS_=true _R_CHECK_CRAN_INCOMING_USE_ASPELL_=true R CMD check --as-cran ${file}
else
echo "Error, no file '${file}' produced"
exit 2
fi