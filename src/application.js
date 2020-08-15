import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import { changeRegistrationState, changeStateRSS } from './view';
import parseRSS from './rssParser';

export default () => {
  yup.addMethod(yup.string, 'findSameFeed', function wrapper(arr, message) {
    return this.test('test-name', message, function findSameFeed(value) {
      return new Promise((resolve, reject) => {
        const gotDouble = arr.includes(value);
        if (!gotDouble) {
          resolve(true);
        } else {
          reject(this.createError({ message }));
        }
      });
    });
  });

  const state = {
    registrationProcess: {
      state: 'filling',
      validationState: 'valid',
      errors: [],
    },
    addedChannels: [],
    rss: {
      feeds: [],
      posts: [],
    },
  };

  const corsAPI = 'https://cors-anywhere.herokuapp.com';
  const watchedRegistration = onChange(state.registrationProcess, changeRegistrationState);
  const watchedState = onChange(state, changeStateRSS);
  const form = document.querySelector('.rss-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    watchedRegistration.errors = [];
    const formData = new FormData(form);
    const rss = formData.get('url');
    const schema = yup.string().url().findSameFeed(watchedState.addedChannels, 'rss has been added');
    schema.validate(rss)
      .then((url) => {
        watchedRegistration.validationState = 'valid';
        watchedRegistration.state = 'sending';
        axios.get(new URL(`../${url}`, corsAPI))
          .then(({ status, data }) => {
            if (status !== 200) {
              throw new Error('not response');
            }
            return data;
          })
          .then((response) => {
            const channelData = parseRSS(response);
            if (channelData === null) {
              throw new Error('rss channel has not found');
            }
            watchedRegistration.state = 'finished';
            watchedState.addedChannels.push(url);
            const { feed, posts } = channelData;
            watchedState.rss = {
              feeds: [feed, ...watchedState.rss.feeds],
              posts: [...posts, ...watchedState.rss.posts],
            };
          })
          .catch((err) => {
            watchedRegistration.errors.push(err.message);
            watchedRegistration.state = 'failed';
          });
      })
      .catch((err) => {
        watchedRegistration.errors = [...watchedRegistration.errors, ...err.errors];
        watchedRegistration.validationState = 'invalid';
      });
  });
};
