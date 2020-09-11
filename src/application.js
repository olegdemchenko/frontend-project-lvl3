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
const validate = (schema, value) => {
  try {
    schema.validateSync(value);
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
        valid: true,
        error: null,
      },
      data: {
        feeds: [],
        posts: [],
      },
    };

    const autoUpdateDelay = 5000;

    const elements = {
      form: document.querySelector('.rss-form'),
      feedback: document.querySelector('.feedback'),
      input: document.querySelector('input[name="url"]'),
      button: document.querySelector('button[name="button"]'),
      container: document.querySelector('.feeds'),
    };

    const messages = {
      success: i18next.t('success'),
      waiting: i18next.t('waiting'),
      validationError: i18next.t('errors.validation'),
    };

    const watchedState = initView(elements, state, messages);
    const addId = (data, id) => mapValues(data, (value) => value.map((elem) => ({ ...elem, id })));

    const getNewStateData = (newData) => {
      const newStateData = transform(watchedState.data, (acc, value, key) => {
        if (newData[key]) {
          acc[key] = [...newData[key], ...value];
        } else {
          acc[key] = [...value];
        }
        return acc;
      }, {});
      return newStateData;
    };

    const autoUpdate = ({ url, id, delay }) => makeRequest(url)
      .then(({ data }) => {
        // eslint-disable-next-line no-param-reassign
        delay = autoUpdateDelay;
        const { items: newPosts } = parse(data);
        const oldPosts = watchedState.data.posts.filter(({ id: postId }) => postId === id);
        const diff = differenceWith(
          newPosts,
          oldPosts,
          (newPost, oldPost) => newPost.title === oldPost.title,
        );
        const postsWithId = addId({ posts: diff }, id);
        const newStateData = getNewStateData(postsWithId);
        watchedState.data = newStateData;
      })
      .catch(() => {
        // eslint-disable-next-line no-param-reassign
        delay *= 2;
      })
      .finally(() => setTimeout(() => autoUpdate({ url, id, delay }), delay));

    elements.input.addEventListener('input', () => {
      watchedState.form.processState = 'filling';
      watchedState.form.valid = true;
      watchedState.form.error = null;
    });

    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const addedFeeds = watchedState.data.feeds.map(({ url }) => url);
      const validationSchema = yup.string().url().required().notOneOf(addedFeeds);
      const formData = new FormData(elements.form);
      const newUrl = formData.get('url');
      const validationError = validate(validationSchema, newUrl);
      if (validationError) {
        watchedState.form.valid = false;
        return;
      }
      watchedState.form.valid = true;
      watchedState.form.processState = 'sending';
      makeRequest(newUrl)
        .then(({ data }) => {
          const channelData = parse(data);
          if (channelData === null) {
            watchedState.form.processState = 'failed';
            watchedState.form.error = i18next.t('errors.parsing');
            return;
          }
          watchedState.form.processState = 'finished';
          const { channel: feed, items: posts } = channelData;
          feed.url = newUrl;
          feed.delay = autoUpdateDelay;
          const id = uniqueId();
          const dataWithId = addId({ feeds: [feed], posts }, id);
          const newStateData = getNewStateData(dataWithId);
          watchedState.data = newStateData;
          setTimeout(() => autoUpdate(dataWithId.feeds[0]), autoUpdateDelay);
        })
        .catch(({ message }) => {
          watchedState.form.processState = 'failed';
          watchedState.form.error = message;
        });
    });
  }).catch((e) => console.log(e));
};
