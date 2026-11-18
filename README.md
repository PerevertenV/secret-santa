# 🎅 Таємний Санта

Статичний сайт для GitHub Pages. Без бекенду: результат жеребкування лежить у `docs/users.json`
**зашифрованим** паролем кожного учасника (PBKDF2 + AES-GCM), тож у публічному репо його не прочитати.

## Швидкий старт (Windows, потрібен Node.js 18+)

```bash
cd D:\Tools\secret-santa
npm run init        # створить people.local.json з тестовими людьми (один раз)
# відкрий people.local.json і впиши справжні імена/логіни (паролі можна лишити)
npm run generate    # жеребкування + шифрування -> docs/users.json, паролі -> credentials.local.txt
npm start           # http://localhost:8080
```

- `people.local.json` і `credentials.local.txt` у git **не потрапляють** (.gitignore).
- `npm run generate` ніде не друкує, хто кому дарує. Ти бачиш тільки логіни/паролі.
- Жеребкування — одне велике коло: ніхто не тягне себе, ніхто не тягне чужого двічі.

## Формат people.local.json

```json
{
  "people": [
    { "name": "Вадим", "login": "vadym", "password": "секрет", "admin": true },
    { "name": "Юра",   "login": "yura",  "password": "секрет2" }
  ]
}
```

Мінімум 3 людини. `admin: true` дає кнопку «Адмінка» (рекомендую тільки собі).

## Деплой на GitHub Pages

1. Створи репо, `git init`, `git add .`, `git commit`, `git push`.
2. Settings → Pages → Source: *Deploy from a branch*, branch `main`, папка **/docs**.
3. Через хвилину сайт буде на `https://<user>.github.io/<repo>/`.

## Перезапуск жеребкування

`npm run generate` → `git add docs/users.json` → commit → push.
Новий `drawId` автоматично скидає в усіх «вже витягнув» і блюр.

## Налаштування жартів

`docs/config.js` → `gagGifs`: список посилань на гіфки для сторінки «Хто дарує мені?»
(або поклади файли в `docs/gifs/` і пиши `gifs/назва.gif`).

## Що працює на браузері, а що ні

- Стан «вже крутив» і «імʼя відкрите/заблюроване» зберігається в `localStorage` пристрою.
- Вішлісти та лічильник прогресу потребують запису на сервер — це окремий етап (токен у репо або Firebase).
