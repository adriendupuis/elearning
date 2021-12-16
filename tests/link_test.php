<?php

$markdownPattern = '\[[^\[]*\]\([^ )]*\)';
$nakedUrlPattern = 'https?://[^ ]*[^ "<)*,.]';
$verbose = in_array('-v', $argv);
if ($verbose) {
    array_splice($argv, array_search('-v', $argv), 1);
}

// Not tested URLs
$excludedUrls = [
    function ($url) {
        return false !== strpos($url, '//example.com');
    },
];

// The redirection itself is not reported as a problem. The redirection target will still be tested.
$excludedRedirections = [
    function ($url, $location) {
        return $location === str_replace('moodle.org/en/', 'moodle.org/311/en/', $url);
    },
    function ($url, $location) {
        return $location === str_replace('symfony.com/doc/current/', 'symfony.com/doc/6.0/', $url);
    },
];

$toBeFixed = false;
foreach (array_slice($argv, 1) as $file) {
    echo "\n$file\n";
    $grep = trim(shell_exec("grep -onE '$markdownPattern|$nakedUrlPattern' $file"));
    if (empty($grep)) {
        continue;
    }
    $grep = explode("\n", $grep);
    $line = 0;
    for ($index = 0; $index < count($grep); ++$index) {
        $link = $grep[$index];
        $matches = [];
        $isMarkdown = preg_match('/(?P<line>[0-9]+)?:?\[(?P<text>.*)]\((?P<url>.*)\)/', $link, $matches);
        if ($isMarkdown) {
            $url = $matches['url'];
            $text = $matches['text'];
        } else {
            preg_match('/(?P<line>[0-9]+)?:?(?P<url>.*)/', $link, $matches);
            $url = $matches['url'];
            $text = '';
        }
        if (array_key_exists('line', $matches) && strlen($matches['line'])) {
            $line = $matches['line'];
        }
        foreach ($excludedUrls as $excludedUrl) {
            if ($excludedUrl($url)) {
                continue 2;
            }
        }
        $headers = @get_headers($url);
        if ($headers && count($headers)) {
            $firstLinePart = explode(' ', $headers[0]);
            $code = (int)$firstLinePart[1];
            switch ($code) {
                case 200:
                    $fragmentFound = true;
                    if (false !== strpos($url, '#')) {
                        $contents = file_get_contents($url);
                        $fragment = parse_url($url, PHP_URL_FRAGMENT);
                        if (false === strpos($contents, "\"$fragment\"")) {
                            $toBeFixed = true;
                            $fragmentFound = false;
                            echo "$line: $code $url [$text]: anchor \"$fragment\" not found.\n";
                        }
                    }
                    if ($verbose && $fragmentFound) {
                        echo "$line: $code $url [$text]\n";
                    }

                    break;
                case 404:
                    $toBeFixed = true;
                    echo "$line: $code $url [$text]\n";
                    break;
                case 301:
                case 302:
                    $location = '(unknown)';
                    foreach ($headers as $header) {
                        if (0 === strpos(strtolower($header), 'location: ')) {
                            if (false !== preg_match('/^[Ll]ocation: (?P<location>.*)$/', $header, $matches)) {
                                $location = $matches['location'];
                                $parsedUrl = parse_url($url);
                                $parsedLocation = parse_url($location);
                                foreach (array_keys($parsedUrl) as $key) {
                                    if (!array_key_exists($key, $parsedLocation)) {
                                        $parsedLocation[$key] = $parsedUrl[$key];
                                    }
                                }
                                if (array_key_exists('fragment', $parsedLocation) && !empty($parsedLocation['fragment']) && '#' !== $parsedLocation['fragment'][0]) {
                                    $fragment = '#' . $parsedLocation['fragment'];
                                } else {
                                    $fragment = '';
                                }
                                $fullLocation = "${parsedLocation['scheme']}://${parsedLocation['host']}${parsedLocation['path']}$fragment";
                                // Add destination to tested URLs:
                                array_splice($grep, $index + 1, 0, [$fullLocation]);
                                break;
                            }
                        }
                    }
                    $excluded = false;
                    foreach ($excludedRedirections as $excludedRedirection) {
                        if ($excludedRedirection($url, $fullLocation)) {
                            $excluded = true;
                        }
                    }
                    if (!$excluded) {
                        $toBeFixed = true;
                    }
                    if ($verbose || !$excluded) {
                        echo "$line: $code $url → $location [$text]\n";
                    }
                    break;
            }
        }
    }
}
echo "\n";

exit($toBeFixed ? 1 : 0);
