const WhoCan = require('./index.js'),
  Assert = require('assert'),
  UUID = require('uuid');

require( 'console-group' ).install();

async function test1() {

  const can = new WhoCan();

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);

  Assert(await can.can(identifier, action, target));
}

async function test2() {

  const can = new WhoCan();

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  Assert(!(await can.can(identifier, action, target)));
}

async function test3() {
  const can = new WhoCan();

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);
  await can.allow(identifier, UUID.v4(), target);
  await can.allow(identifier, UUID.v4(), target);
  await can.allow(identifier, UUID.v4(), UUID.v4());
  await can.allow(identifier, UUID.v4(), UUID.v4());
  await can.allow(UUID.v4(), action, target);
  await can.allow(UUID.v4(), UUID.v4(), target);
  await can.allow(UUID.v4(), UUID.v4(), target);
  await can.allow(UUID.v4(), UUID.v4(), UUID.v4());
  await can.allow(UUID.v4(), UUID.v4(), UUID.v4());

  Assert(await can.can(identifier, action, target));
}

async function test4() {
  const can = new WhoCan();

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);

  Assert(await can.can(identifier, action, target));

  await can.disallow(identifier, action, target);

  Assert(!(await can.can(identifier, action, target)));
}

async function test5() {

  class Backer {
    can(identifier, action, target) {
      return false;
    }
    allow(identifier, action, target) {
      return false;
    }
    disallow(identifier, action, target) {
      return false;
    }
  }

  const can = new WhoCan(new Backer());

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  Assert(!(await can.can(identifier, action, target)));
}

async function test6() {

  class Backer {
    can(identifier, action, target) {
      return true;
    }
    allow(identifier, action, target) {
      return false;
    }
    disallow(identifier, action, target) {
      return false;
    }
  }

  const can = new WhoCan(new Backer());

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  Assert(await can.can(identifier, action, target));
}

async function test7() {

  class Backer {
    can(identifier, action, target) {
      return Promise.resolve(true);
    }
    allow(identifier, action, target) {
      return false;
    }
    disallow(identifier, action, target) {
      return false;
    }
  }

  const can = new WhoCan(new Backer());

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  Assert(await can.can(identifier, action, target));
}

async function test8() {

  const can = new WhoCan();

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(() => identifier, () => action, () => target);

  Assert(await can.can(identifier, action, target));
}

async function test9() {

  const can = new WhoCan();

  const middleware = (action) => {
    return (request, response, next) => {
      can.can(request.user.id, action, request.params.id)
        .then((allow) => {
          if (!allow) {
            return next(new Error('Forbidden'));
          }
          next(null);
        })
        .catch(next);
    }
  };

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  const result = await new Promise((resolve) => {
    middleware(action)({
      user: {
        id: identifier
      },
      params: {
        id: target
      }
    }, {}, resolve);
  });

  Assert(!!result);
}


async function test10() {

  const can = new WhoCan();

  const middleware = (action) => {
    return (request, response, next) => {
      can.can(request.user.id, action, request.params.id)
        .then((allow) => {
          if (!allow) {
            return next(new Error('Forbidden'));
          }
          next(null);
        })
        .catch(next);
    }
  };

  const identifier = UUID.v4(),
    action = UUID.v4(),
    target = UUID.v4();

  await can.allow(identifier, action, target);

  const result = await new Promise((resolve) => {
    middleware(action)({
      user: {
        id: identifier
      },
      params: {
        id: target
      }
    }, {}, resolve);
  });

  Assert(!result);
}

async function run() {

  await [
    test1,
    test2,
    test3,
    test4,
    test5,
    test6,
    test7,
    test8,
    test9,
    test10
  ].reduce((promise, f, index) => {
    return promise.then(async function() {
      console.group(`Running Test ${index + 1}`);
      await f();
      console.log(`Complete Test ${index + 1}`);
      console.groupEnd();
    })
  }, Promise.resolve());

  await test1();

}

run()
  .then(() => {
    console.log('Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });