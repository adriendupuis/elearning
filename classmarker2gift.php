<?php
//TODO: Is it working with every CSV export config?

$rowIndex = 1;
if (false !== ($fileHandle = fopen($argv[1], 'r'))) {
    $headRowCells = null;
    while (false !== ($rowCells = fgetcsv($fileHandle))) {
        if (0 === strpos($rowCells[0], 'Question Type: ')) {
            $headRowCells = $rowCells;
            continue;
        }
        if (null === $headRowCells) {
            fwrite(STDERR, 'Missing heading row.');
        }

        $assocRowCells = array_combine(array_slice($headRowCells, 0, count($rowCells)), $rowCells);
        $questionType = $rowCells[0];

        if (!empty($questionType)) {
            echo "::Q${assocRowCells['Question Id']}::\n";
            $question = formatText($assocRowCells['Question']);
            echo "$question {\n";
            switch ($questionType) {
                case 'matching':
                    {
                        foreach (range('A', 'Z') as $letter) {
                            $clue = formatText($assocRowCells["$letter Clue"]);
                            $match = formatText($assocRowCells["$letter Match"]);
                            if (empty($clue)) {
                                break;
                            }
                            echo "  =$clue -> $match\n";
                        }
                    }
                    break;
                case 'multiplechoice':
                case 'multipleresponse':
                    {
                        $correct = explode(',', $assocRowCells['Correct']);
                        foreach (range('A', 'Z') as $letter) {
                            $answer = formatText($assocRowCells["Answer $letter"]);
                            if (empty($answer)) {
                                break;
                            }
                            $correctness = in_array($letter, $correct) ? '=' : '~';
                            echo "  $correctness$answer\n";
                        }
                    }
                    break;
                case 'truefalse':
                    {
                        $correctness = 'A' === $assocRowCells['Correct'] ? 'T' : 'F';
                        echo "  $correctness\n";
                    }
                    break;
                default:
                    {
                        fwrite(STDERR, "Unknown question type '$questionType'.");
                    }
                    break;
            }
            echo "}\n";
        }

        $rowIndex++;
    }
    fclose($fileHandle);
}

function formatText($code) {
    return preg_replace(['/^&nbsp;/', '/&nbsp;$/'], '', str_replace(["\n", '<', '>', '[', ']', "\xc2\xa0"], ['\n', '&lt;', '&gt;', '<', '>', '&nbsp;'], escapeSpecialCharacters(trim($code))));
}

function escapeSpecialCharacters($code) {
    return preg_replace('/([~=#{}])/', '\\\$1', $code);
}
