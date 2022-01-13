# eLearning reveal.js Demo

## Intro

- [Part 2.2](#/2/1)
- [Part 2.2](#part_2.2)
- [Submit](#button[type="submit"])

---

## Part 1.1

```php
<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SomeController {
    public function someAction(Request $request): Response {
        return new Response("<html><body><code>{$request->getRequestUri()}</code></body></html>");
    }
}
```

(Doc: https://symfony.com/doc/current/controller.html)

--

## Part 1.2

```yaml
some:
    path: /some
    controller: App\Controller\SomeController::someAction
```

(Ref: [Symfony: Creating Routes in YAML](https://symfony.com/doc/current/routing.html#creating-routes-in-yaml-xml-or-php-files))

---

## Part 2.1

Skeleton is provided in [this zip archive: skeleton.zip](download/skeleton.zip)

<img src="https://upload.wikimedia.org/wikipedia/commons/a/ac/A_professor_asking_a_medical_student_his_prognosis_for_a_par_Wellcome_V0011614.jpg" />
<img style="width: 119px; height: 172px;" src="https://upload.wikimedia.org/wikipedia/commons/a/ac/A_professor_asking_a_medical_student_his_prognosis_for_a_par_Wellcome_V0011614.jpg" />
<img style="width: 108px; height: 167px;" src="https://upload.wikimedia.org/wikipedia/commons/8/87/Skeletons.png" />

--

## Part 2.2
<a name="part_2.2"></a>

[_Educational technology_ Wikipedia article](https://en.wikipedia.org/wiki/Educational_technology)

---

## Outro
<a name="part_2.2"></a>
<button type="submit">Submit</button>
