import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import i18next from 'i18next';
import resources from './locales';
import { changeRegistrationState, changeStateRSS } from './view';
import parseRSS from './rssParser';

export default i18next.init({
  lng: 'eng',
  debug: true,
  resources,
}).then(() => () => {
  yup.setLocale({
    string: {
      url: i18next.t('validationError'),
    },
  });

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
      message: '',
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
    const formData = new FormData(form);
    const rss = formData.get('url');
    const schema = yup.string().url().findSameFeed(watchedState.addedChannels, i18next.t('foundSameError'));
    schema.validate(rss)
      .then((url) => {
        watchedRegistration.validationState = 'valid';
        watchedRegistration.message = i18next.t('waiting');
        watchedRegistration.state = 'sending';
        axios.get(new URL(`../${url}`, corsAPI))
          .then(({ status, data }) => {
            if (status !== 200) {
              throw new Error(i18next.t('registrationError'));
            }
            return data;
          })
          .then((response) => {
            const channelData = parseRSS(response);
            if (channelData === null) {
              throw new Error(i18next.t('parsingError'));
            }
            watchedRegistration.message = i18next.t('success');
            watchedRegistration.state = 'finished';
            watchedState.addedChannels.push(url);
            const { feed, posts } = channelData;
            watchedState.rss = {
              feeds: [feed, ...watchedState.rss.feeds],
              posts: [...posts, ...watchedState.rss.posts],
            };
          })
          .catch(({ message }) => {
            watchedRegistration.message = message;
            watchedRegistration.state = 'failed';
          });
      })
      .catch(({ errors: [message] }) => {
        watchedRegistration.message = message;
        watchedRegistration.validationState = 'invalid';
      });
  });
});
