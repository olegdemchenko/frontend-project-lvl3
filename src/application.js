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
const validate = ([schema, ...restSchemas], value) => {
  try {
    schema.validateSync(value);
  } catch ({ errors: [error] }) {
    return error;
  }
  return restSchemas.length === 0 ? null : validate(restSchemas, value);
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
        valid: true,
        additionalInfo: {
          message: '',
          processError: '',
          validationError: '',
        },
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
    const getAddedUrls = () => watchedState.data.feeds.map(({ url }) => url);

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

    elements.input.addEventListener('input', () => {
      watchedState.form.processState = 'filling';
      watchedState.form.valid = true;
      Object.keys(watchedState.form.additionalInfo).forEach((key) => {
        watchedState.form.additionalInfo[key] = '';
      });
    });

    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const validationSchemas = [
        yup.string().url(i18next.t('errors.validation')),
        yup.mixed().notOneOf(getAddedUrls(), i18next.t('errors.foundSame')),
      ];
      const formData = new FormData(elements.form);
      const newUrl = formData.get('url');
      const validationError = validate(validationSchemas, newUrl);
      if (validationError) {
        watchedState.form.valid = false;
        watchedState.form.additionalInfo.validationError = validationError;
        return;
      }
      watchedState.form.valid = true;
      watchedState.form.additionalInfo.validationError = '';
      watchedState.form.processState = 'sending';
      watchedState.form.additionalInfo.message = i18next.t('waiting');
      makeRequest(newUrl)
        .then(({ data }) => {
          const channelData = parse(data);
          if (channelData === null) {
            watchedState.form.processState = 'failed';
            watchedState.form.additionalInfo.processError = i18next.t('errors.parsing');
            return;
          }
          watchedState.form.processState = 'finished';
          watchedState.form.additionalInfo.message = i18next.t('success');
          const { channel: feed, items: posts } = channelData;
          feed.url = newUrl;
          const id = uniqueId();
          changeStateData({ feeds: [feed], posts }, id);
        })
        .catch(({ response: { statusText } }) => {
          watchedState.form.processState = 'failed';
          watchedState.form.additionalInfo.processError = statusText;
        });
    });

    const updateFeed = (url, id) => makeRequest(url)
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

    setTimeout(function autoUpdate() {
      const requests = watchedState.data.feeds.map(({ url, id }) => updateFeed(url, id));
      Promise.allSettled(requests)
        .then(() => setTimeout(autoUpdate, autoUpdateDelay))
        .catch((e) => console.log(e));
    }, autoUpdateDelay);
  }).catch((e) => console.log(e));
};
