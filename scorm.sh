#!/usr/bin/env bash

# https://www.ispringsolutions.com/blog/how-to-convert-html-to-scorm#turninghtmltoscormthemanualway
# https://myelearningworld.com/3-best-ways-to-create-a-scorm-content-package/

# Arguments

outputFile=$1;
outputTitle=$2;
indexFile=$3;
resources=${@:4};


# Config

packageRoot='./package.tmp';
packageResourcesDir='resources';
scormPackageTemplate='./scorm.package.template.tmp.zip';
useScormDotComPackageTemplate=false;
useScormDotComManifestTemplate=true;
releaseDir='./release';
outputFile="$releaseDir/$outputFile";


# Config and arguments checking
if [ -e $packageRoot ]; then
  echo "Error: $packageRoot already exists.";
  exit 1;
fi;
mkdir -p $packageRoot/$packageResourcesDir;
if [ ! -d $releaseDir ]; then
  mkdir -p $releaseDir;
fi
if [ -e $outputFile ]; then
  echo 'Warning: remove previous output file to renew it:';
  rm -v $outputFile;
fi;


# Resources

cp $indexFile $packageRoot/$packageResourcesDir/;
for path in $resources; do
  cp -r ${path%%/} $packageRoot/$packageResourcesDir/;
done;


# Manifest

## Structure and XSD
#curl --output $scormPackageTemplate "https://21w98o3yqgi738kmv7xrf9lj-wpengine.netdna-ssl.com/wp-content/assets/golf_examples/PIFS/ContentPackagingSingleSCO_SCORM12.zip"; # https://scorm.com/scorm-explained/technical-scorm/golf-examples/
curl --output $scormPackageTemplate "https://myelearningworld.com/wp-content/uploads/2016/05/course_1.zip"; # https://myelearningworld.com/3-best-ways-to-create-a-scorm-content-package/
unzip $scormPackageTemplate *.xml *.xsd -d $packageRoot;
rm $scormPackageTemplate;

## Resource declarations
files='';
for file in $(find $packageRoot/$packageResourcesDir -type f); do
    file=$(echo "$file" | sed "s@$packageRoot/@@");
    files+="<file href=\"$file\" />";
done
if $useScormDotComManifestTemplate; then
  curl --output $packageRoot/imsmanifest.xml https://scorm.com/wp-content/assets/SchemaDefinitionFiles/SCORM%201.2%20Schema%20Definition/imsmanifest.xml;
  sed -i '' "s@<title>Title</title>@<title>$outputTitle</title>@" $packageRoot/imsmanifest.xml;
  sed -i '' "s@<resource \(.*\) href=\"index.html\">@<resource \1 href=\"$packageResourcesDir/$indexFile\">@" $packageRoot/imsmanifest.xml;
  sed -i '' "s@<file href=\"index.html\" />@$files@" $packageRoot/imsmanifest.xml;
else
  sed -i '' 's@Course_1_organization@organization@' $packageRoot/imsmanifest.xml;
  sed -i '' "s@<title>Course_1</title>@<title>$outputTitle</title>@" $packageRoot/imsmanifest.xml;
  sed -i '' "s@<resource \(.*\) href=\"res/start_1.html\">@<resource \1 href=\"$packageResourcesDir/$indexFile\">@" $packageRoot/imsmanifest.xml;
  sed -i '' "s@<file href=\"res/start_1.html\"/>@$files@" $packageRoot/imsmanifest.xml;
fi;


# Package

cd $packageRoot;
zip -9 -r ../$outputFile .;
cd -;
rm -rf $packageRoot;

exit 0;
