import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/dom';
import fs from 'fs';
import path from 'path';
import prettier from 'prettier';
import userEvent from '@testing-library/user-event';
import nock from 'nock';
import axios from 'axios';
import timer from 'timer-promise';
import run from '../src/application';
import getUrlWithCORSFree from '../src/common';

axios.defaults.adapter = require('axios/lib/adapters/http');

const options = {
  parser: 'html',
  htmlWhitespaceSensitivity: 'ignore',
  tabWidth: 4,
};

const getFormattedHTML = () => prettier.format(document.body.innerHTML, options);
const pathToFixture = (fixtureName) => path.join('__tests__', '__fixtures__', fixtureName);
const readFile = (filename) => fs.readFileSync(pathToFixture(filename)).toString();

const links = {
  notValid: 'hello world',
  notExisted: 'http://somenotexistedsite.com',
  rss: 'http://lorem-rss.herokuapp.com',
};

const messages = {
  wait: 'please, wait',
  responseError: '',
  validationError: 'this url is not valid',
};

let elements;

const enterUrl = (link) => {
  userEvent.type(elements.emailInput, link);
  userEvent.click(elements.submit);
};

beforeAll(() => {
  nock.disableNetConnect();
});

beforeEach(() => {
  const initHtml = readFile('index.html');
  document.body.innerHTML = initHtml;
  elements = {
    submit: screen.getByRole('button'),
    emailInput: screen.getByRole('textbox', { name: /url/ }),
  };
  run();
});

test('validation error', () => {
  enterUrl(links.notValid);
  return waitFor(() => {
    expect(screen.getByTestId('feedback')).toHaveTextContent(messages.validationError);
  });
});

test('response error', () => {
  const scope = nock(getUrlWithCORSFree(links.notExisted)).get('/rss')
    .reply(404);
  enterUrl(`${links.notExisted}/rss`);
  return waitFor(() => {
    expect(screen.getByTestId('feedback')).toHaveTextContent(messages.responseError);
    scope.done();
  });
});

test('wait', () => {
  const scope = nock(getUrlWithCORSFree(links.rss)).get('/feed').delayConnection(2000).reply(200);
  enterUrl(`${links.rss}/feed`);
  return waitFor(() => {
    expect(screen.getByTestId('feedback')).toHaveTextContent(messages.wait);
    if (scope) {
      scope.done();
    }
  });
});

test('success', () => {
  const response = readFile('lorem.html');
  const scope = nock(getUrlWithCORSFree(links.rss)).get('/feed').reply(200, response);
  enterUrl(`${links.rss}/feed`);
  return timer.start('start', 200)
    .then(() => {
      expect(getFormattedHTML()).toMatchSnapshot();
      scope.done();
    });
});

test('update', () => {
  const responseBeforeUpdate = readFile('loremBeforeUpdate.html');
  const responseAfterUpdate = readFile('loremAfterUpdate.html');
  const scope = nock(getUrlWithCORSFree(links.rss))
    .get('/feed?unit=second')
    .reply(200, responseBeforeUpdate)
    .get('/feed?unit=second')
    .reply(200, responseAfterUpdate);
  enterUrl(`${links.rss}/feed?unit=second`);
  return timer.start('start', 5500)
    .then(() => {
      expect(getFormattedHTML()).toMatchSnapshot();
      scope.done();
    });
}, 7000);
