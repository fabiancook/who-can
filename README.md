# WhoCan

Who can do what?

### Install

```
yarn install who-can
```
```
npm install --save who-can
```

### API

```
const WhoCan = require('who-can');

const can = new WhoCan();

async function purchaseBook(user, book) {
    await can.allow(user.id, 'take', book.id);
}

async function takeBook(user, book) {
    if (!await can.can(user.id, 'take', book.id)) {
        throw new Error('Please puchase the book');
    }
    return book;
}

const user = {
        id: '0d399b15-cad4-4c85-b892-15a14fd40a48'
    },
    book = {
        id: 'b3111978-3a1a-416f-979c-d21a8b4365c6'
    }

purchaseBook(user, book)
    .then(() => takeBook(user, book))
    .then(() => console.log('I have the book!'))
    .catch(() => console.error('Should have brought the book first!'));
```