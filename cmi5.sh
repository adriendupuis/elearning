#!/usr/bin/env bash

#TODO: find proper doc refs

# Arguments

outputFile=$1;
outputTitle=$2;
indexFile=$3;
resources=${@:4};


# Config

packageRoot='./package.tmp';
packageResourcesDir='resources';
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

## cmi5.xml
curl --output $packageRoot/cmi5.xml "https://raw.githubusercontent.com/adlnet/cmi5-Client-Library/master/Examples/cmi5.xml";
sed -i '' "s@<url>AUExample1.html</url>@<url>$packageResourcesDir/$indexFile</url>@" $packageRoot/cmi5.xml;

## Resource declarations
files='';
for file in $(find $packageRoot/$packageResourcesDir -type f); do
    file=$(echo "$file" | sed "s@$packageRoot/@@");
    #TODO
done
#TODO

# Package

cd $packageRoot;
zip -9 -r ../$outputFile .;
cd -;
rm -rf $packageRoot;

exit 0;
