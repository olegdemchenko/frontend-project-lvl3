import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import {
  uniqueId,
  differenceWith,
  mapValues,
  transform,
} from 'lodash';
import resources from './locales';
import initView from './view';
import parse from './rssParser';
import getUrlWithCORSFree from './common';

const makeRequest = (url) => axios.get(getUrlWithCORSFree(url));

const validate = (newUrl, addedUrls) => {
  try {
    yup.string().url(i18next.t('errors.validation')).validateSync(newUrl);
    yup.mixed().notOneOf(addedUrls, i18next.t('errors.foundSame')).validateSync(newUrl);
    return null;
  } catch ({ errors: [error] }) {
    return error;
  }
};

export default () => {
  i18next.init({
    lng: 'eng',
    debug: true,
    resources,
  }).then(() => {
    const state = {
      form: {
        processState: 'filling',
        message: '',
        processError: '',
        valid: true,
        validationError: '',
      },
      data: {
        feeds: [],
        posts: [],
      },
    };

    let autoUpdateDelay = 5000;

    const elements = {
      form: document.querySelector('.rss-form'),
      feedback: document.querySelector('.feedback'),
      input: document.querySelector('input[name="url"]'),
      button: document.querySelector('button[name="button"]'),
      container: document.querySelector('.feeds'),
    };

    const watchedState = initView(elements, state);

    const addId = (collection, id) => collection.map((elem) => ({ ...elem, id }));

    const isUrlValid = (link) => {
      const addedUrls = watchedState.data.feeds.map(({ url }) => url);
      const error = validate(link, addedUrls);
      if (error) {
        watchedState.form.valid = false;
        watchedState.form.validationError = error;
        return false;
      }
      watchedState.form.valid = true;
      watchedState.form.validationError = '';
      return true;
    };

    const changeStateData = (newData, id) => {
      const newDataWithId = mapValues(newData, (value) => addId(value, id));
      const newStateData = transform(watchedState.data, (acc, value, key) => {
        if (newDataWithId[key]) {
          acc[key] = [...newDataWithId[key], ...value];
        } else {
          acc[key] = [...value];
        }
        return acc;
      }, {});
      watchedState.data = newStateData;
    };

    const getRSSData = (url) => {
      watchedState.form.processState = 'sending';
      watchedState.form.message = i18next.t('waiting');
      makeRequest(url)
        .then(({ status, data }) => {
          if (status !== 200) {
            watchedState.form.processState = 'failed';
            watchedState.form.processError = i18next.t('errors.registration');
            return;
          }
          const channelData = parse(data);
          if (channelData === null) {
            watchedState.form.processState = 'failed';
            watchedState.form.processError = i18next.t('errors.parsing');
            return;
          }
          watchedState.form.processState = 'finished';
          watchedState.form.message = i18next.t('success');
          watchedState.form.processError = '';
          const { channel: feed, items: posts } = channelData;
          feed.url = url;
          const id = uniqueId();
          changeStateData({ feeds: [feed], posts }, id);
        })
        .catch(({ message }) => {
          watchedState.form.processState = 'failed';
          watchedState.form.processError = message;
        });
    };

    const form = document.querySelector('.rss-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const url = formData.get('url');
      const isValid = isUrlValid(url);
      if (isValid) {
        getRSSData(url);
      }
    });

    setTimeout(function autoUpdate() {
      watchedState.data.feeds.forEach(({ url, id }) => {
        makeRequest(url)
          .then(({ status, data }) => {
            if (status === 200) {
              autoUpdateDelay = 5000;
              const { items: newPosts } = parse(data);
              const oldPosts = watchedState.data.posts.filter(({ id: postId }) => postId === id);
              const diff = differenceWith(
                newPosts,
                oldPosts,
                (newPost, oldPost) => newPost.title === oldPost.title,
              );
              changeStateData({ posts: diff }, id);
            } else {
              autoUpdateDelay *= 2;
            }
          })
          .catch((err) => console.log(err));
      });
      setTimeout(autoUpdate, autoUpdateDelay);
    }, autoUpdateDelay);
  });
};
