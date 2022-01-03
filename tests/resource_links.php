<?php

$patterns = [];
foreach ([
             'link' => 'href',
             'img' => 'src',
             'script' => 'src',
         ] as $tag => $attribute) {
    $patterns[] = "<$tag [^>]*$attribute=\"([^\"]+)\"";
}
$patterns[] = '\[[^]]+\]\((\.\/[^)]+)\)';
$defaultScheme = 'https';
$verbose = in_array('-v', $argv);
if ($verbose) {
    array_splice($argv, array_search('-v', $argv), 1);
}

// Not tested URLs
$excludedUrls = [
    function ($url) {
        return preg_match('@^/assets/@', $url);
    },
    function ($url) {
        return preg_match('@{{ asset\(.*\) }}@', $url);
    },
    function ($url) {
        return false !== strpos($url, '//upload.wikimedia.org/');
    },
];

$toBeFixed = false;
$grepPatterns = implode('|', $patterns);
foreach (array_slice($argv, 1) as $file) {
    echo "\n$file\n";
    $grep = trim(shell_exec("grep -onE '$grepPatterns' $file"));
    if (empty($grep)) {
        continue;
    }
    $grep = explode("\n", $grep);
    $line = 0;
    foreach ($grep as $link) {
        foreach ($patterns as $pattern) {
            if (preg_match("/(?P<line>[0-9]+)?:?$pattern/", $link, $matches)) {
                break;
            }
        }
        if (array_key_exists(2, $matches) && strlen($matches[2])) {
            $url = $matches[2];
        } else {
            //TODO
            continue;
        }
        foreach ($excludedUrls as $excludedUrl) {
            if ($excludedUrl($url)) {
                if ($verbose) {
                    echo "$line: 000 $url: URL skipped, not tested\n";
                }
                continue 2;
            }
        }
        if (array_key_exists('line', $matches) && strlen($matches['line'])) {
            $line = $matches['line'];
        }
        if (preg_match('@^(https?:)?//@', $url)) {
            $headers = @get_headers('//' === substr($url, 0, 2) ? "$defaultScheme:$url" : $url);
            if ($headers && count($headers)) {
                $firstLinePart = explode(' ', $headers[0]);
                $code = (int)$firstLinePart[1];
            }
        } else {
            $code = file_exists($url) ? 200 : 404;
        }
        if (isset($code)) {
            switch ($code) {
                case 200:
                    if ($verbose) {
                        echo "$line: $code $url\n";
                    }
                    break;
                case 301:
                case 302:
                case 403;
                case 404:
                default:
                    $toBeFixed = true;
                    echo "$line: $code $url\n";
            }
        }
    }
}
echo "\n";

exit($toBeFixed ? 1 : 0);
