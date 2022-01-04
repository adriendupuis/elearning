<?php

$usageFilePatterns = ['*.md', '*.html', '*.css'];
$excludedResourcePaths = ['README.md'];
$excludedUsagePaths = [];
$verbose = in_array('-v', $argv);
if ($verbose) {
    array_splice($argv, array_search('-v', $argv), 1);
}

$usageFiles = [];
$resourceFiles = [];

foreach ($usageFilePatterns as $pattern) {
    $usageFiles = array_merge($usageFiles, array_map(function ($path) {
        return preg_replace('@^./@', '', $path);
    }, explode(PHP_EOL, trim(shell_exec("find . -type f -name '$pattern';")))));
}

$findOptions = empty($excludedResourcePaths) ? '' : ' ' . implode(' -a ', array_map(function ($path) {
        return "-not -wholename $path";
    }, $excludedResourcePaths));
foreach (array_slice($argv, 1) as $path) {
    $path = preg_replace('@^./@', '', rtrim($path, '/'));
    if (empty($path) || in_array($path, $excludedResourcePaths)) {
        continue;
    }
    if (is_dir($path)) {
        $resourceFiles = array_merge($resourceFiles, explode(PHP_EOL, trim(shell_exec("find $path -type f{$findOptions};"))));
    } elseif (file_exists($path)) {
        $resourceFiles[] = $path;
    } else {
        //TODO: error
    }
}

$toBeFixed = false;
foreach ($resourceFiles as $resourceFile) {
    $usageFound = false;
    foreach ($usageFiles as $usageFile) {
        if ($usageFile === $resourceFile) {
            continue;
        }
        $usageFileInfo = pathinfo($usageFile);
        $relativeResourceFile = $resourceFile;
        if ('css' === $usageFileInfo['extension'] && '.' !== $usageFileInfo['dirname']) {
            $relativeResourceFile = preg_replace("@^${usageFileInfo['dirname']}/@", '', $resourceFile);
        }
        $grep = shell_exec("grep \"$relativeResourceFile\" $usageFile");
        if (!empty($grep)) {
            $usageFound = true;
            break;
        }
    }
    if (!$usageFound) {
        $toBeFixed = true;
        echo "$resourceFile is not used.\n";
    } elseif ($verbose) {
        echo "$resourceFile is used at least in $usageFile\n";
    }
}

exit($toBeFixed ? 1 : 0);
