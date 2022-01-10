<?php


class TestableUrl
{
    /** @var string */
    private $url;

    /** @var null|string */
    private $text = null;

    /** @var null|string */
    private $file = null;

    /** @var null|integer */
    private $line = null;

    /** @var null|bool */
    private $external = null;

    /** @var bool */
    private $tested = false;

    /** @var null|int */
    private $code = null;

    /** @var null|TestableUrl */
    private $location = null;

    /** @var null|bool */
    private $fragmentFound = null;

    private const EXTERNAL_PATTERN = '^(https?:)?//';
    private const PATTERN_DELIMITER = '@';
    public const DEFAULT_SCHEME = 'https';

    public function __construct(string $url, string $text = null, string $file = null, string $line = null, bool $test = false)
    {
        $this->url = $url;
        $this->text = $text;
        $this->file = $file;
        $this->line = $line;
        if ($test) {
            $this->test();
        }
    }

    public function test(bool $testLocations = true, bool $testFragment = true, bool $cache = true): self
    {
        if (!$this->isTested() || !$cache) {
            $test = self::testUrl($this->getSolvedUrl(), $this->isExternal(), $testFragment);
            $this->code = $test['code'];
            $this->location = null === $test['location'] ? null : new TestableUrl($test['location'], null, $this->getFile(), $this->getLine(), $testLocations);
            $this->fragmentFound = $test['fragment_found'];
            $this->tested = true;
        }

        return $this;
    }

    public function isTested(): bool
    {
        return $this->tested;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public static function getRelativePath($sourcePath, $targetPath)
    {
        $sourcePathInfo = pathinfo($sourcePath);
        $targetPathInfo = pathinfo($targetPath);
        $sourceDir = '.' === $sourcePathInfo['dirname'] ? [] : explode('/', $sourcePathInfo['dirname']);
        $targetDir = '.' === $targetPathInfo['dirname'] ? [] : explode('/', $targetPathInfo['dirname']);
        while (!empty($sourceDir) && !empty($targetDir) && $sourceDir[0] === $targetDir[0]) {
            // Remove common path
            array_shift($sourceDir);
            array_shift($targetDir);
        }
        while (!empty($sourceDir)) {
            // Add descending directories `..`
            array_shift($sourceDir);
            array_unshift($targetDir, '..');
        }

        return (empty($targetDir) ? '' : implode('/', $targetDir) . '/') . $targetPathInfo['basename'];
    }

    public static function solveRelativePath($sourcePath, $targetPath)
    {
        $sourcePathInfo = pathinfo($sourcePath);
        if ('.' !== $sourcePathInfo['dirname']) {
            // Add common path
            $targetPath = "{$sourcePathInfo['dirname']}/$targetPath";
            // Remove descending directories `..`
            $targetPathInfo = pathinfo($targetPath);
            $targetDir = explode('/', $targetPathInfo['dirname']);
            for ($i = 0; $i < count($targetDir); $i++) {
                if ($i > 0 && '..' === $targetDir[$i]) {
                    array_splice($targetDir, $i - 1, 2);
                }
            }
            $targetPath = (empty($targetDir) ? '' : implode('/', $targetDir) . '/') . $targetPathInfo['basename'];
        }

        return $targetPath;
    }

    public function getSolvedUrl()
    {
        $url = $this->isFragment() ? $this->getFile() . $this->getUrl() : $this->getUrl();
        if (!$this->isExternal() && $this->getFile()) {
            $url = self::solveRelativePath($this->getFile(), $url);
        }
        return $url;
    }


    public function hasText(): bool
    {
        return null !== $this->text;
    }

    public function getText(): ?string
    {
        return $this->text;
    }

    public function __toString(): string
    {
        return $this->getUrl() . ($this->hasText() ? " “{$this->getText()}”" : '') . ($this->hasLocation() ? " → {$this->getLocation()->getUrl()}" : '');
    }

    public function getFile(): string
    {
        return $this->file;
    }

    public function getLine(): int
    {
        return $this->line;
    }

    public static function isExternalUrl(string $url): bool
    {
        return preg_match(self::PATTERN_DELIMITER . self::EXTERNAL_PATTERN . self::PATTERN_DELIMITER, $url);
    }

    public function isExternal(): bool
    {
        if (null === $this->external) {
            $this->external = self::isExternalUrl($this->url);
        }

        return $this->external;
    }

    public const NOT_TESTABLE_CODE = 999;

    /** @param null|bool $external */
    public static function testUrl(string $url, bool $external = null, $testFragment = true): array
    {
        $code = self::NOT_TESTABLE_CODE;
        $location = null;
        $fragmentFound = null;

        if (null === $external) {
            $external = self::isExternalUrl($url);
        }

        $headers = [];
        if ($external) {
            $defaultScheme = self::DEFAULT_SCHEME;
            $headers = @get_headers('//' === substr($url, 0, 2) ? "$defaultScheme:$url" : $url);
            if ($headers && count($headers)) {
                $firstLinePart = explode(' ', $headers[0]);
                $code = (int)$firstLinePart[1];
            }
        } else {
            $code = file_exists(parse_url($url, PHP_URL_PATH)) ? 200 : 404;
        }

        switch ($code) {
            case 200:
                if ($testFragment && self::isUrlWithFragment($url)) {
                    $fragment = self::getUrlFragment($url);
                    $contents = @file_get_contents(self::getUrlWithoutFragment($url));
                    $fragmentFound = $contents && false !== strpos($contents, "\"$fragment\"");
                }
                break;
            case 301:
            case 302:
                foreach ($headers as $header) {
                    if (0 === strpos(strtolower($header), 'location: ')) {
                        if (false !== preg_match('/^[Ll]ocation: (?P<location>.*)$/', $header, $matches)) {
                            $parsedUrl = parse_url($url);
                            $parsedLocation = parse_url($matches['location']);
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
                            $location = "${parsedLocation['scheme']}://${parsedLocation['host']}${parsedLocation['path']}$fragment";
                            break;
                        }
                    }
                }
                break;
            case 403:
            case 404:
            case 500:
            default:
        }

        return [
            'code' => $code,
            'location' => $location,
            'fragment_found' => $fragmentFound,
        ];
    }

    public function getCode(): string
    {
        if (empty($this->code)) {
            return '   ';
        }

        return str_pad($this->code, 3, 0, STR_PAD_LEFT);
    }

    public function hasLocation(): bool
    {
        return null !== $this->location;
    }

    public function getLocation(): ?TestableUrl
    {
        return $this->location;
    }

    /** @return TestableUrl[] */
    public function getLocations(): array
    {
        $locations = [];
        $location = $this;
        while ($location->hasLocation()) {
            $location = $location->getLocation();
            $locations[] = $location;
        }
        return $locations;
    }

    /** @return string[] */
    public function getUrls(): array
    {
        $urls = [$this->getUrl()];
        foreach ($this->getLocations() as $location) {
            $urls[] = $location->getUrl();
        }
        return $urls;
    }

    public static function isUrlWithFragment($url): bool
    {
        return false !== strpos($url, '#');
    }

    public function hasFragment(): bool
    {
        return self::isUrlWithFragment($this->getUrl());
    }

    public static function getUrlFragment($url): string
    {
        return parse_url($url, PHP_URL_FRAGMENT);
    }

    public static function getUrlWithoutFragment($url): string
    {
        return str_replace('#' . self::getUrlFragment($url), '', $url);
    }

    public function getFragment(): string
    {
        return self::getUrlFragment($this->getUrl());
    }

    private function isFragment(): bool
    {
        return 0 === strpos($this->getUrl(), '#');
    }

    public function isFragmentFound(): ?bool
    {
        return $this->fragmentFound;
    }
}

/*
var_dump(TestableUrl::solveRelativePath('common/style.css', 'logo.svg'), 'common/logo.svg');
var_dump(TestableUrl::solveRelativePath('common/style.css', 'images/logo.svg'), 'common/images/logo.svg');
var_dump(TestableUrl::solveRelativePath('common/style.css', '../images/common/logo.svg'), 'images/common/logo.svg');
var_dump(TestableUrl::solveRelativePath('common/style.css', '../common/images/logo.svg'), 'common/images/logo.svg');
var_dump(TestableUrl::solveRelativePath('common/style.css', '../logo.svg'), 'logo.svg');
var_dump(TestableUrl::solveRelativePath('common/style.css', '../../logo.svg'), '../logo.svg');

var_dump(TestableUrl::getRelativePath('common/style.css', 'logo.svg'), '../logo.svg');
var_dump(TestableUrl::getRelativePath('common/style.css', 'common/logo.svg'), 'logo.svg');
var_dump(TestableUrl::getRelativePath('common/style.css', 'common/images/logo.svg'), 'images/logo.svg');
var_dump(TestableUrl::getRelativePath('common/style.css', 'images/common/logo.svg'), '../images/common/logo.svg');
var_dump(TestableUrl::getRelativePath('common/layout/style.css', 'common/images/logo.svg'), '../images/logo.svg');
var_dump(TestableUrl::getRelativePath('common/style.css', '../logo.svg'), '../../logo.svg');

die("\nunit test\n");
*/


class UrlExtractor
{
    /** @var array[] */
    private $patterns = [];

    private const PATTERN_DELIMITER = '@';
    private const LINE_PATTERN = '(?P<line>[0-9]+)?:?';

    /** @param array[]|null $patterns */
    public function __construct(array $patterns = null)
    {
        $this->patterns = null === $patterns ? self::getDefaultPatterns() : $patterns;
        $this->flattenPatterns();
    }

    /** @return TestableUrl[] */
    public function extract(string $file): array
    {
        //var_dump($this->getGrepCommand($file));
        $grepOutput = trim(shell_exec($this->getGrepCommand($file)));
        if (empty($grepOutput)) {
            return [];
        }

        $grepLines = explode("\n", $grepOutput);
        unset($grepOutput);

        $urls = [];

        $line = 0;
        $linePattern = self::LINE_PATTERN;
        $patterns = $this->getPhpPatterns(pathinfo($file, PATHINFO_EXTENSION));
        $patternDelimiter = self::PATTERN_DELIMITER;
        for ($index = 0; $index < count($grepLines); ++$index) {
            $grepLine = $grepLines[$index];
            $matches = [];
            foreach ($patterns as $pattern) {
                if (preg_match("{$patternDelimiter}{$linePattern}{$pattern}{$patternDelimiter}", $grepLine, $matches)) {
                    break;
                }
            }
            if (array_key_exists('line', $matches) && strlen($matches['line'])) {
                $line = $matches['line'];
            }
            if (empty($matches['url'])) {
                continue;
            }
            $urls[] = new TestableUrl($matches['url'], array_key_exists('text', $matches) ? $matches['text'] : null, $file, $line, false);
        }

        return $urls;
    }

    private function flattenPatterns(string $reRunExtension = null): self
    {
        if (array_key_exists('*', $this->patterns)) {
            unset($this->patterns['*']);
        }
        if (null === $reRunExtension) {
            $oldPatterns = $this->patterns;
            $newPatterns = [];
        } else if (array_key_exists($reRunExtension, $this->patterns)) {
            $oldPatterns = [$reRunExtension => $this->patterns[$reRunExtension]];
            $newPatterns = $this->patterns;
        } else {
            throw new InvalidArgumentException("Unknown extension '$reRunExtension'");
        }

        $reRun = [];

        foreach ($oldPatterns as $extension => $patterns) {
            $newPatterns[$extension] = [];
            foreach ($patterns as $pattern) {
                if (array_key_exists($pattern, $oldPatterns)) {
                    $reRun[] = $extension;
                    $newPatterns[$extension] = array_merge($newPatterns[$extension], $oldPatterns[$pattern]);
                } else {
                    $newPatterns[$extension][] = $pattern;
                }
            }
        }

        $this->patterns = $newPatterns;

        foreach ($reRun as $extension) {
            $this->flattenPatterns($extension);
        }

        if (!$reRunExtension) {
            $allPatterns = [];
            foreach ($this->patterns as $extension => $patterns) {
                $this->patterns[$extension] = array_unique($this->patterns[$extension], SORT_REGULAR);
                $allPatterns = array_merge($allPatterns, $this->patterns[$extension]);
            }
            $this->patterns['*'] = array_unique($allPatterns, SORT_REGULAR);
        }

        return $this;
    }

    /** @return array[] */
    public static function getDefaultPatterns(): array
    {
        return [
            'txt' => [
                '(?P<url>(https?:)?//[^ "<>]+[^ "<>)*,.\`])',
            ],
            'css' => [
                'url\(["\']?(?P<url>[^)]*)["\']?\)',
            ],
            'scss' => [
                'css',
            ],
            'html' => [
                'data-markdown="(?P<url>[^"]+)"',
                self::getHtmlTagPattern('a', 'href', true),
                self::getHtmlTagPattern('link', 'href'),
                self::getHtmlTagPattern('script', 'src'),
                self::getHtmlTagPattern('img', 'src'),
            ],
            'md' => [
                '\[(?P<text>[^\[]*)\]\((?P<url>[^ )]*)\)',
                self::getHtmlTagPattern('img', 'src'),
                self::getHtmlTagPattern('a', 'href', true),//TODO: shouldn't be there
                'txt',
            ],
        ];
    }

    public static function getHtmlTagPattern(string $tagName, string $urlAttribute, bool $text = false): string
    {
        return "<$tagName [^>]*$urlAttribute=\"(?P<url>[^\"]+)\"" . ($text ? '[^>]*>(?P<text>[^<]*)' : '');
    }

    /** @return string[] */
    public function getPhpPatterns(string $extension): array
    {
        return $this->patterns[$extension];
    }

    public function getGrepPattern(string $extension): string
    {
        return implode('|', array_map(function ($pattern) {
            return self::convertPatternFromPhpToGrep($pattern);
        }, $this->getPhpPatterns($extension)));
    }

    public function getGrepCommand(string $file): string
    {
        $pattern = str_replace('"', '\"',
            $this->getGrepPattern(pathinfo($file, PATHINFO_EXTENSION)));
        return "grep -onE \"$pattern\" $file";
    }

    public static function convertPatternFromPhpToGrep(string $pattern): string
    {
        return preg_replace('/\?P<[^>]+>/', '', $pattern);
    }

    public function getGrepUrlSearchPattern(string $extension, string $url): string
    {
        return implode('|', array_map(function (string $pattern) use ($url) {
            return
                self::convertPatternFromPhpUrlExtractionToGrepUrlSearch($pattern, $url)
                .
                '|' . str_replace($url, "./$url", self::convertPatternFromPhpUrlExtractionToGrepUrlSearch($pattern, $url));
        }, $this->getPhpPatterns($extension)));
    }

    public function getGrepUrlSearchCommand(string $file, string $url): string
    {
        $pattern = str_replace('"', '\"',
            $this->getGrepUrlSearchPattern(pathinfo($file, PATHINFO_EXTENSION), $url));
        return "grep -onE \"$pattern\" $file";
    }

    public static function convertPatternFromPhpUrlExtractionToGrepUrlSearch(string $pattern, string $url): ?string
    {
        if (null !== $phpUrlSearchPattern = self::convertPatternFromPhpUrlExtractionToPhpUrlSearch($pattern, $url)) {
            return self::convertPatternFromPhpToGrep($phpUrlSearchPattern);
        }

        return null;
    }

    private static function convertPatternFromPhpUrlExtractionToPhpUrlSearch(string $pattern, string $url): ?string
    {
        if (null !== $group = self::extractGroupFromPattern($pattern, 'url')) {
            return str_replace($group, $url, $pattern);
        }

        return null;
    }

    public static function extractGroupFromPattern($pattern, $groupName): ?string
    {
        $p = $pattern;
        $sp = "(?P<$groupName>";
        $s = strpos($p, $sp);
        if (false === $s) {
            $sp = "(?<$groupName>";
            $s = strpos($p, $sp);
            if (false === $s) {
                return null;
            }
        }
        for ($e = $s + strlen($sp), $bc = 0, $pc = 0, $f = false; !$f && $e < strlen($p); $e++) {
            if ('\\' === $p[$e]) {
                // escape next char
                $e++;
                continue;
            }
            if ('[' === $p[$e]) {
                $bc++;
            }
            if (']' === $p[$e]) {
                $bc--;
            }
            if (0 === $bc) {
                if ('(' === $p[$e]) {
                    $pc++;
                }
                if (')' === $p[$e]) {
                    $pc--;
                }
                if (')' === $p[$e] && 0 > $pc) {
                    $f = true;
                }
            }
        }
        return substr($p, $s, $e - $s);
    }
}

/*
foreach (UrlExtractor::getDefaultPatterns() as $extension => $patterns) {
    foreach ($patterns as $pattern) {
        var_dump($pattern, UrlExtractor::extractGroupFromPattern($pattern, 'url'));
    }
}
var_dump($pattern, UrlExtractor::extractGroupFromPattern('href="(?<url>((?<scheme>https?):)?//(?P<host>[^/]+)(?P<path>.*))"', 'url'));
die("\nunit test\n");
*/


class UrlTester
{
    /** @var string[] */
    private $usageFiles = [];

    /** @var string[] */
    private $resourceFiles = [];

    /** @var array[] */
    private $exclusionTests = [
        'url' => [],
        'location' => [],
        'fragment' => [],
    ];

    /** @var resource */
    private $output;

    /** @var resource */
    private $error;

    /** @var UrlExtractor */
    private $urlExtractor;

    /** @var TestableUrl[][] */
    private $urls = [];

    public const VERBOSITY_QUIET = 1000;
    public const VERBOSITY_LOUD = 0;
    public const VERBOSITY_DEFAULT = 300;

    /** @param array[] $exclusionTests */
    public function __construct(array $usageFiles = [], array $resourceFiles = [], array $exclusionTests = null, $output = null, $error = null)
    {
        $this->setUsageFiles($usageFiles);
        $this->setResourceFiles($resourceFiles);
        $this->setExclusionTests(is_array($exclusionTests) ? $exclusionTests : self::getDefaultExclusionTests());
        foreach ([
                     'STDOUT' => 'output',
                     'STDERR' => 'error',
                 ] as $defaultConstant => $argumentVariable) {
            if (null === $$argumentVariable && defined($defaultConstant)) {
                $$argumentVariable = constant($defaultConstant);
            }
            if (!is_resource($$argumentVariable) || 'stream' !== get_resource_type($$argumentVariable)) {
                throw new InvalidArgumentException("$argumentVariable must be a stream resource");
            }
            $this->$argumentVariable = $$argumentVariable;
        }
        $this->urlExtractor = new UrlExtractor();
    }

    /** @return string[] */
    public function getUsageFiles(): array
    {
        return $this->usageFiles;
    }

    /** @param string[] $usageFiles */
    public function setUsageFiles(array $usageFiles): void
    {
        $this->usageFiles = $usageFiles;
    }

    /** @param string|string[] $usageFiles */
    public function addUsageFiles(...$usageFiles): void
    {
        foreach ($usageFiles as $usageFile) {
            if (is_array($usageFile)) {
                $this->usageFiles = array_merge($this->usageFiles, $usageFile);
            } elseif (is_string($usageFile)) {
                $this->usageFiles[] = $usageFile;
            }
        }
    }

    /** @return string[] */
    public function getResourceFiles(): array
    {
        return $this->resourceFiles;
    }

    /** @param string[] $resourceFiles */
    public function setResourceFiles(array $resourceFiles): void
    {
        $this->resourceFiles = $resourceFiles;
    }

    /** @param string|string[] $resourceFiles */
    public function addResourceFiles(...$resourceFiles): void
    {
        foreach ($resourceFiles as $resourceFile) {
            if (is_array($resourceFile)) {
                $this->resourceFiles = array_merge($this->resourceFiles, $resourceFile);
            } elseif (is_string($resourceFile)) {
                $this->resourceFiles[] = $resourceFile;
            }
        }
    }

    public function setExclusionTests($tests)
    {
        foreach (array_keys($this->exclusionTests) as $type) {
            if (array_key_exists($type, $tests)) {
                $this->exclusionTests[$type] = $tests[$type];
            }
        }
    }

    public static function getDefaultExclusionTests()
    {
        return [
            'url' => [
                function (string $url, string $file = null): bool {
                    return false !== strpos($url, '//example.com');
                },
                //function (string $url, string $file = null): bool {
                //    return (bool) preg_match('@(https?:)?//([a-z]+\.)?localhost(:[0-9]+)?(/|$)@', $url);
                //},
            ],
            'location' => [
                //function (string $url, string $location, string $file = null): bool {
                //    return $location === "$url/";
                //},
                //function (string $url, string $location, string $file = null): bool {
                //    return $location === str_replace('http://', 'https://', $url);
                //},
                function (string $url, string $location, string $file = null): bool {
                    return $location === str_replace('moodle.org/en/', 'moodle.org/311/en/', $url);
                },
                function (string $url, string $location, string $file = null): bool {
                    return $location === str_replace('symfony.com/doc/current/', 'symfony.com/doc/6.0/', $url);
                },
            ],
            'fragment' => [
                function (string $url, string $file = null): bool {
                    if (in_array($file, ['reveal.js.md'])) {
                        return 0 === strpos($url, '#') || 0 === strpos($url, "$file#");
                    }
                    return false;
                }
            ]
        ];
    }

    public function test(int $invalidityThreshold = self::VERBOSITY_DEFAULT, bool $fragmentValidity = true): bool
    {
        return $this->testUsages($invalidityThreshold, $fragmentValidity, self::VERBOSITY_QUIET) && $this->testResources(self::VERBOSITY_QUIET);
    }

    public function testUsages(int $invalidityThreshold = 300, bool $fragmentValidity = true, int $verbosityThreshold = self::VERBOSITY_DEFAULT): bool
    {
        $valid = true;

        $testableUrls = [];
        foreach ($this->getUsageFiles() as $file) {
            $testableUrls = array_merge($testableUrls, $this->urlExtractor->extract($file));
        }
        $file = null;
        /** @var TestableUrl $testableUrl */
        foreach ($testableUrls as $testableUrl) {
            if (self::VERBOSITY_QUIET > $verbosityThreshold) {
                if ($testableUrl->getFile() !== $file) {
                    $file = $testableUrl->getFile();
                    $this->output("\n{$file}");
                }
            }

            $url = self::formatUrl($testableUrl->getSolvedUrl());
            $testFragment = $fragmentValidity && !$this->isExcludedFragment($testableUrl);
            if (array_key_exists($url, $this->urls) && is_array($this->urls[$url])) {
                $this->urls[$url][] = $testableUrl;
            } else {
                if ($this->isExcludedUrl($testableUrl)) {
                    continue;
                }
                $testableUrl->test(false, $testFragment);
                $this->urls[$url] = [$testableUrl];
            }
            $testedUrl = $this->urls[$url][0];
            if ($testedUrl->hasLocation() && $this->isExcludedLocation($testedUrl)) {
                continue;
            }
            if ($testedUrl->getCode() >= $invalidityThreshold) {
                $valid = false;
            }
            if ($testFragment && 200 == $testedUrl->getCode() && $testedUrl->hasFragment() && !$testedUrl->isFragmentFound()) {
                $this->outputUrl($testableUrl, $testedUrl);
                $valid = false;
            } else if ($testedUrl->getCode() >= $verbosityThreshold) {
                $this->outputUrl($testableUrl, $testedUrl);
            }

            $location = $testedUrl;
            while ($location = $location->getLocation()) {
                $url = self::formatUrl($location->getSolvedUrl());
                if (array_key_exists($url, $this->urls)) {
                    $testedLocation = $this->urls[$url][0];
                } else {
                    $testedLocation = $location->test(false);
                    $this->urls[$url] = [$testedLocation];
                }
                $this->urls[$url][] = $testedUrl;
                if (($fragmentValidity && 200 == $testedUrl->getCode() && $testedLocation->hasFragment() && !$testedLocation->isFragmentFound())
                    || ($testedLocation->getCode() >= $invalidityThreshold)) {
                    $valid = false;
                }
                if ($testedLocation->getCode() >= $verbosityThreshold) {
                    if (302 < $verbosityThreshold) {
                        $this->outputUrl($testableUrl, $testedUrl, false, false);
                    }
                    $this->outputUrl($location, $testedLocation, false, false);
                }
                if (!$location->hasLocation() && $testedLocation->hasLocation()) {
                    $location = $testedLocation;
                }
            }
        }
        $this->output('');

        return $valid;
    }

    public function testResources(int $verbosity = self::VERBOSITY_DEFAULT): bool
    {
        $valid = true;

        foreach ($this->getResourceFiles() as $resourceFile) {
            $url = self::formatUrl($resourceFile);
            if (array_key_exists($url, $this->urls) && !empty($this->urls[$url])) {
                if (self::VERBOSITY_LOUD >= $verbosity) {
                    $testedUrl = $this->urls[$url][0];
                    $usageCount = count($this->urls[$url]);
                    if ($usageCount > 1) {
                        $this->output("$url is used $usageCount times, at least in {$testedUrl->getFile()} at line {$testedUrl->getLine()}.");
                    } else {
                        $this->output("$url is used in {$testedUrl->getFile()} at line {$testedUrl->getLine()}.");
                    }
                }
                continue;
            }
            if (empty($this->urls)) {
                // If `testUsage()` haven't been run previously…
                $found = false;
                foreach ($this->getUsageFiles() as $usageFile) {
                    $relativeUrl = TestableUrl::getRelativePath($usageFile, $url);
                    $grepOutput = trim(shell_exec($this->urlExtractor->getGrepUrlSearchCommand($usageFile, $relativeUrl)));
                    if (!empty($grepOutput)) {
                        $found = true;
                        break;
                    }
                }
                if ($found) {
                    if (self::VERBOSITY_LOUD >= $verbosity) {
                        $this->output("$url is used at least in $usageFile.");
                    }
                } else {
                    $valid = false;
                    if (self::VERBOSITY_QUIET > $verbosity) {
                        $this->output("$url is not used.");
                    }
                }
            } else {
                $valid = false;
                if (self::VERBOSITY_QUIET > $verbosity) {
                    $this->output("$url is not used.");
                }
            }
        }
        $this->output('');

        return $valid;
    }

    public function isExcludedUrl(TestableUrl $testableUrl): bool
    {
        foreach ($this->exclusionTests['url'] as $test) {
            if ($test(self::formatUrl($testableUrl->getSolvedUrl()), $testableUrl->getFile())) {
                return true;
            }
        }
        return false;
    }

    public function isExcludedLocation(TestableUrl $testableUrl): bool
    {
        foreach ($this->exclusionTests['location'] as $test) {
            if ($test(self::formatUrl($testableUrl->getSolvedUrl()), self::formatUrl($testableUrl->getLocation()->getSolvedUrl()), $testableUrl->getFile())) {
                return true;
            }
        }
        return false;
    }

    public function isExcludedFragment(TestableUrl $testableUrl): bool
    {
        foreach ($this->exclusionTests['fragment'] as $test) {
            if ($test(self::formatUrl($testableUrl->getSolvedUrl()), $testableUrl->getFile())) {
                return true;
            }
        }
        return false;
    }

    public static function formatUrl(string $url): string
    {
        if (TestableUrl::isExternalUrl($url)) {
            $url = preg_replace('@^//@', TestableUrl::DEFAULT_SCHEME . '://', $url);
        } else {
            $url = preg_replace('@^\./@', '', $url);
        }

        return $url;
    }

    private function outputUrl(TestableUrl $testableUrl, TestableUrl $testedUrl = null, $withFile = false, $withLine = true, $withCode = true): self
    {
        $file = $testableUrl->getFile();
        $file = $withFile && $file !== null ? "{$file}@" : '';
        $line = $testableUrl->getLine();
        $line = $withLine && null !== $line ? "{$line}: " : ': ';
        if ($withCode) {
            $code = null === $testedUrl ? $testableUrl->getCode() : $testedUrl->getCode();
            $code = null === $code ? '--- ' : "$code ";
        } else {
            $code = '';
        }
        $location = null !== $testedUrl && !$testableUrl->hasLocation() && $testedUrl->hasLocation() ? " → {$testedUrl->getLocation()->getUrl()}" : '';
        $fragment = 200 == $testedUrl->getCode() && $testableUrl->hasFragment() ? ($testedUrl->isFragmentFound() ? ' (fragment found)' : " ! `#{$testableUrl->getFragment()}` fragment not found.") : '';
        $this->output("{$file}{$line}{$code}{$testableUrl}{$location}{$fragment}");
        return $this;
    }

    private function output(string $line): self
    {
        fwrite($this->output, $line . PHP_EOL);
        return $this;
    }

    private function error(string $line): self
    {
        fwrite($this->error, $line . PHP_EOL);
        return $this;
    }
}


class Finder
{
    const TYPE_BLOCK = 'b';// block special
    const TYPE_CHAR = 'c';// character special
    const TYPE_DIR = 'd';// directory
    const TYPE_FILE = 'f';// regular file
    const TYPE_LINK = 'l';// symbolic link
    const TYPE_FIFO = 'p';// FIFO
    const TYPE_SOCKET = 's';// socket

    private $where;
    private $minDepth;
    private $maxDepth;
    private $includedNames = [];
    private $excludedNames = [];
    private $includedTypes = [];
    private $excludedTypes = [];

    public function __construct(string $where = '.', int $minDepth = null, int $maxDepth = null)
    {
        $this->where = preg_replace('@/$@', '', $where);
        $this->minDepth = $minDepth;
        $this->maxDepth = $maxDepth;
    }

    public function includeName($pattern): self
    {
        $this->includedNames[] = $pattern;
        return $this;
    }

    public function inN($pattern): self
    {
        return $this->includeName($pattern);
    }

    public function excludeName($pattern): self
    {
        $this->excludedNames[] = $pattern;
        return $this;
    }

    public function exN($pattern): self
    {
        return $this->excludeName($pattern);
    }

    public function includeType($type): self
    {
        $this->includedTypes[] = $type;
        return $this;
    }

    public function inT($type): self
    {
        return $this->includeType($type);
    }

    public function excludeType($type): self
    {
        $this->excludedTypes[] = $type;
        return $this;
    }

    public function exT($type): self
    {
        return $this->excludeType($type);
    }

    public function find(): array
    {
        return array_map(function ($path) {
            return preg_replace('@^\./@', '', $path);
        }, explode("\n", trim(shell_exec($this->getFindCommand()))));
    }

    private function getFindCommand(): string
    {
        $criteria = [];

        foreach ([
                     'mindepth' => $this->minDepth,
                     'maxdepth' => $this->maxDepth,
                 ] as $option => $value) {
            if (null !== $value) {
                $criteria[] = "-{$option} $value";
            }
        }

        $groups = [];
        foreach ([
                     'name' => [
                         'in' => $this->includedNames,
                         'ex' => $this->excludedNames,
                     ],
                     'type' => [
                         'in' => $this->includedTypes,
                         'ex' => $this->excludedTypes,
                     ],
                 ] as $type => $patterns) {
            if (!empty($patterns['in'])) {
                $groups[] = implode(' -o ', array_map(function ($pattern) use ($type) {
                    return "-{$type} '{$pattern}'";
                }, $patterns['in']));
            }
            if (!empty($patterns['ex'])) {
                $groups[] = implode(' -a ', array_map(function ($pattern) use ($type) {
                    return "! -{$type} '{$pattern}'";
                }, $patterns['ex']));
            }
        }
        if (!empty($groups)) {
            $criteria[] = '\( ' . implode(' \) -a \( ', $groups) . ' \)';
        }

        $criteria = empty($criteria) ? '' : ' ' . implode(' ', $criteria);
        return "find {$this->where}{$criteria};";
    }
}


class UrlTestCommand
{
    static function newUrlTesterFromCommand($argv)
    {
        $usageFileFinder = new Finder();
        $resourceFileFinder = new Finder();

        //TODO: parse $argv to set the Finders

        return new UrlTester($usageFileFinder->find(), $resourceFileFinder->find());
    }
}

//$urlTester = UrlTestCommand::newUrlTesterFromCommand($argv);
$urlTester = new UrlTester(
    (new Finder('.'))
        ->includeName('*.md')
        ->includeName('*.html')
        ->includeName('*.css')
        ->find(),
    array_unique(array_merge(
        (new Finder('./download/'))
            ->includeType(Finder::TYPE_FILE)
            ->find(),
        (new Finder('.', 1, 1))
            ->includeName('*.md')->excludeName('README.md')
            ->includeName('*.css')
            ->includeName('*.js')
            ->find()
    ))
);

$usageTestSuccess = $urlTester->testUsages(/** /300, true, UrlTester::VERBOSITY_LOUD/**/);
$resourceTestSuccess = $urlTester->testResources(/** /UrlTester::VERBOSITY_LOUD/**/);

exit($usageTestSuccess && $resourceTestSuccess ? 0 : 1);
