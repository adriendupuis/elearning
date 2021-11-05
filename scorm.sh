#!/usr/bin/env bash

# https://www.ispringsolutions.com/blog/how-to-convert-html-to-scorm#turninghtmltoscormthemanualway
# https://myelearningworld.com/3-best-ways-to-create-a-scorm-content-package/

# Arguments

outputFile=$1;
outputTitle=$2;
indexFile=$3;
resources=${@:4};


# Config

scormPackageRoot='./scorm.package.tmp';
scormPackageResourcesDir='resources';
scormPackageTemplate='./scorm.package.template.tmp.zip';
useScormDotComPackageTemplate=false;
useScormDotComManifestTemplate=true;
releaseDir='./release';
outputFile="$releaseDir/$outputFile";


# Framework

function sedi() {
  if [ 'Darwin' == `uname` ]; then
    sed -i '' "$1" "$2";
  else
    sed -i "$1" "$2";
  fi;
}


# Config and arguments checking
if [ -e $scormPackageRoot ]; then
  echo "Error: $scormPackageRoot already exists.";
  exit 1;
fi;
mkdir -p $scormPackageRoot/$scormPackageResourcesDir;
if [ ! -d $releaseDir ]; then
  mkdir -p $releaseDir;
fi
if [ -e $outputFile ]; then
  echo 'Warning: remove previous output file to renew it:';
  rm -v $outputFile;
fi;


# Resources

cp $indexFile $scormPackageRoot/$scormPackageResourcesDir/;
for path in $resources; do
  cp -r ${path%%/} $scormPackageRoot/$scormPackageResourcesDir/;
done;


# Manifest

## Structure and XSD
#curl --output $scormPackageTemplate "https://21w98o3yqgi738kmv7xrf9lj-wpengine.netdna-ssl.com/wp-content/assets/golf_examples/PIFS/ContentPackagingSingleSCO_SCORM12.zip"; # https://scorm.com/scorm-explained/technical-scorm/golf-examples/
curl --output $scormPackageTemplate "https://myelearningworld.com/wp-content/uploads/2016/05/course_1.zip"; # https://myelearningworld.com/3-best-ways-to-create-a-scorm-content-package/
unzip $scormPackageTemplate *.xml *.xsd -d $scormPackageRoot;
rm $scormPackageTemplate;

## Resource declarations
files='';
for file in $(find $scormPackageRoot/$scormPackageResourcesDir -type f); do
    file=$(echo "$file" | sed "s@$scormPackageRoot/@@");
    files+="<file href=\"$file\" />";
done
if $useScormDotComManifestTemplate; then
  curl --output $scormPackageRoot/imsmanifest.xml https://scorm.com/wp-content/assets/SchemaDefinitionFiles/SCORM%201.2%20Schema%20Definition/imsmanifest.xml;
  sedi "s@<title>Title</title>@<title>$outputTitle</title>@" $scormPackageRoot/imsmanifest.xml;
  sedi "s@<resource \(.*\) href=\"index.html\">@<resource \1 href=\"$scormPackageResourcesDir/$indexFile\">@" $scormPackageRoot/imsmanifest.xml;
  sedi "s@<file href=\"index.html\" />@$files@" $scormPackageRoot/imsmanifest.xml;
else
  sedi 's@Course_1_organization@organization@' $scormPackageRoot/imsmanifest.xml;
  sedi "s@<title>Course_1</title>@<title>$outputTitle</title>@" $scormPackageRoot/imsmanifest.xml;
  sedi "s@<resource \(.*\) href=\"res/start_1.html\">@<resource \1 href=\"$scormPackageResourcesDir/$indexFile\">@" $scormPackageRoot/imsmanifest.xml;
  sedi "s@<file href=\"res/start_1.html\"/>@$files@" $scormPackageRoot/imsmanifest.xml;
fi;


# Package

cd $scormPackageRoot;
zip -9 -r ../$outputFile .;
cd -;
rm -rf $scormPackageRoot;

exit 0;
