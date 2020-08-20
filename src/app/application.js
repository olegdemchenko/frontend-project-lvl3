import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import i18next from 'i18next';
import { uniqueId, differenceWith, noop } from 'lodash';
import resources from './locales';
import { changeRegistrationState, changeStateData } from './view';
import parse from './rssParser';
import getUrlWithCORSFree from '../common';

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

  yup.addMethod(yup.string, 'findSameFeed', function wrapper(channels, message) {
    return this.test('test-name', message, function findSameFeed(value) {
      return new Promise((resolve, reject) => {
        const channelsHasSameFeed = channels.some(({ url }) => url === value);
        if (channelsHasSameFeed) {
          reject(this.createError({ message }));
        } else {
          resolve(true);
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
    autoUpdateDelay: 5000,
    data: {
      feeds: [],
      posts: [],
    },
  };

  const addId = (collection, id) => collection.map((elem) => ({ ...elem, id }));
  const makeRequest = (url) => axios.get(getUrlWithCORSFree(url));

  const watchedRegistration = onChange(state.registrationProcess, changeRegistrationState);
  const watchedStateData = onChange(state.data, changeStateData);

  const form = document.querySelector('.rss-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const rss = formData.get('url');
    const schema = yup.string().url().findSameFeed(state.addedChannels, i18next.t('foundSameError'));
    schema.validate(rss)
      .then((url) => {
        watchedRegistration.validationState = 'valid';
        watchedRegistration.message = i18next.t('waiting');
        watchedRegistration.state = 'sending';
        makeRequest(url)
          .then(({ status, data }) => {
            if (status !== 200) {
              throw new Error(i18next.t('registrationError'));
            }
            return data;
          })
          .then((response) => {
            const channelData = parse(response);
            if (channelData === null) {
              throw new Error(i18next.t('parsingError'));
            }
            watchedRegistration.message = i18next.t('success');
            watchedRegistration.state = 'finished';
            const { feed, posts } = channelData;
            const id = uniqueId();
            state.addedChannels.push({ url, id });
            const feedWithId = addId([feed], id);
            const postsWithId = addId(posts, id);
            watchedStateData.feeds = [...feedWithId, ...watchedStateData.feeds];
            watchedStateData.posts = [...postsWithId, ...watchedStateData.posts];
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

  setTimeout(function autoUpdate() {
    state.addedChannels.forEach(({ url, id }) => {
      makeRequest(url)
        .then(({ status, data }) => {
          if (status === 200) {
            const { posts: newPosts } = parse(data);
            const oldPosts = watchedStateData.posts.filter(({ id: postId }) => postId === id);
            const diff = differenceWith(
              newPosts,
              oldPosts,
              (newPost, oldPost) => newPost.title === oldPost.title,
            );
            const diffWithId = addId(diff, id);
            watchedStateData.posts = [...diffWithId, ...watchedStateData.posts];
          } else {
            state.autoUpdateDelay *= 2;
          }
        })
        .catch(noop);
    });
    setTimeout(autoUpdate, state.autoUpdateDelay);
  }, state.autoUpdateDelay);
});
