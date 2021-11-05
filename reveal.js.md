# eLearning reveal.js Demo

## Intro

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

--

## Part 1.2

```yaml
some:
    path: /some
    controller: App\Controller\SomeController::someAction
```

---

## Part 2.1

Skeleton is provided in [this zip archive: skeleton.zip](download/skeleton.zip)

--

## Part 2.2

---

## Outro
