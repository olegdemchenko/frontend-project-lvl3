import '@testing-library/jest-dom';
import { screen } from '@testing-library/dom';
import fs from 'fs';
import path from 'path';
import prettier from 'prettier';
import userEvent from '@testing-library/user-event';
import nock from 'nock';
import axios from 'axios';
import timer from 'timer-promise';
import run from '../src/app/application';
import getUrlWithCORSFree from '../src/common';

axios.defaults.adapter = require('axios/lib/adapters/http');

nock.disableNetConnect();

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

let elements;
beforeEach(() => {
  const initHtml = readFile('index.html');
  document.body.innerHTML = initHtml;
  elements = {
    submit: screen.getByRole('button'),
    emailInput: screen.getByRole('textbox', { name: /url/ }),
  };
  return run.then((app) => app());
});

test('validation error', () => (
  userEvent.type(elements.emailInput, links.notValid)
    .then(() => userEvent.click(elements.submit))
    .then(() => timer.start('start', 15))
    .then(() => expect(getFormattedHTML()).toMatchSnapshot())
));

test('response error', () => {
  const scope = nock(getUrlWithCORSFree(links.notExisted)).get('/rss').reply(404);
  return userEvent.type(elements.emailInput, `${links.notExisted}/rss`)
    .then(() => userEvent.click(elements.submit))
    .then(() => timer.start('start', 200))
    .then(() => {
      expect(getFormattedHTML()).toMatchSnapshot();
      scope.done();
    });
});

test('success', () => {
  const response = readFile('lorem.html');
  const scope = nock(getUrlWithCORSFree(links.rss)).get('/feed').reply(200, response);
  return userEvent.type(elements.emailInput, `${links.rss}/feed`)
    .then(() => userEvent.click(elements.submit))
    .then(() => timer.start('start', 200))
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
  return userEvent.type(elements.emailInput, `${links.rss}/feed?unit=second`)
    .then(() => userEvent.click(elements.submit))
    .then(() => timer.start('start', 5500))
    .then(() => {
      expect(getFormattedHTML()).toMatchSnapshot();
      scope.done();
    });
});
