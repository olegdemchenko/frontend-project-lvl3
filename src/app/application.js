import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import i18next from 'i18next';
import { uniqueId, differenceWith } from 'lodash';
import resources from './locales';
import watcher from './view';
import parse from './rssParser';
import getUrlWithCORSFree from '../common';

export default () => {
  i18next.init({
    lng: 'eng',
    debug: true,
    resources,
  }).then(() => {
    yup.setLocale({
      mixed: {
        notOneOf: i18next.t('foundSameError'),
      },
      string: {
        url: i18next.t('validationError'),
      },
    });

    const state = {
      form: {
        processState: 'filling',
        message: '',
        processError: '',
      },
      validation: {
        valid: true,
        error: '',
      },
      data: {
        feeds: [],
        posts: [],
      },
    };

    const watchedState = onChange(state, watcher);

    let autoUpdateDelay = 5000;
    const addId = (collection, id) => collection.map((elem) => ({ ...elem, id }));

    const makeRequest = (url) => axios.get(getUrlWithCORSFree(url));

    const validate = (link) => {
      const schema = yup.string().url();
      return schema.validate(link)
        .then((validUrl) => {
          const addedUrls = watchedState.data.feeds.map(({ url }) => url);
          return yup.mixed().notOneOf(addedUrls).validate(validUrl);
        })
        .catch(({ errors: [error] }) => {
          throw new Error(error);
        });
    };

    const changeValidationState = (url) => (
      validate(url)
        .then(() => {
          watchedState.validation.valid = true;
          watchedState.validation.error = '';
          return true;
        })
        .catch((err) => {
          watchedState.validation.valid = false;
          watchedState.validation.error = err.message;
          return false;
        })
    );

    const changeStateData = (data, url) => {
      const { channel: feed, items: posts } = data;
      const id = uniqueId();
      feed.url = url;
      const feedWithId = addId([feed], id);
      const postsWithId = addId(posts, id);
      watchedState.data = {
        feeds: [...feedWithId, ...watchedState.data.feeds],
        posts: [...postsWithId, ...watchedState.data.posts],
      };
    };

    const getRSSData = (url) => {
      watchedState.form.processState = 'sending';
      watchedState.form.message = i18next.t('waiting');
      makeRequest(url)
        .then(({ status, data }) => {
          if (status !== 200) {
            watchedState.form.processState = 'failed';
            watchedState.form.processError = i18next.t('registrationError');
            return;
          }
          const channelData = parse(data);
          if (channelData === null) {
            watchedState.form.processState = 'failed';
            watchedState.form.processError = i18next.t('parsingError');
            return;
          }
          watchedState.form.processState = 'finished';
          watchedState.form.message = i18next.t('success');
          watchedState.form.processError = '';
          changeStateData(channelData, url);
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
      const rss = formData.get('url');
      changeValidationState(rss)
        .then((valid) => {
          if (valid === true) {
            getRSSData(rss);
          }
        });
    });

    setTimeout(function autoUpdate() {
      watchedState.data.feeds.forEach(({ url, id }) => {
        makeRequest(url)
          .then(({ status, data }) => {
            if (status === 200) {
              const { items: newPosts } = parse(data);
              const oldPosts = watchedState.data.posts.filter(({ id: postId }) => postId === id);
              const diff = differenceWith(
                newPosts,
                oldPosts,
                (newPost, oldPost) => newPost.title === oldPost.title,
              );
              const diffWithId = addId(diff, id);
              watchedState.data = {
                feeds: [...watchedState.data.feeds],
                posts: [...diffWithId, ...watchedState.data.posts],
              };
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
