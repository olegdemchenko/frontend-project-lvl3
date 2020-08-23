import { memoize } from 'lodash';

const getDOMElems = () => {
  const feedBack = document.querySelector('.feedback');
  const urlInput = document.querySelector('input[name="url"]');
  const button = document.querySelector('button');
  return { feedBack, urlInput, button };
};

const getMemoizedDOMElems = memoize(getDOMElems);

const renderMessage = (value) => {
  const { feedBack } = getMemoizedDOMElems();
  feedBack.textContent = value;
};

const renderRegistration = (path, value) => {
  const { feedBack, urlInput, button } = getMemoizedDOMElems();
  if (path.endsWith('processState')) {
    switch (value) {
      case 'filling': {
        urlInput.removeAttribute('disabled');
        urlInput.value = '';
        button.removeAttribute('disabled');
        break;
      }
      case 'sending': {
        urlInput.setAttribute('disabled', '');
        button.setAttribute('disabled', '');
        feedBack.className = 'feedback text-info';
        break;
      }
      case 'finished': {
        urlInput.removeAttribute('disabled');
        urlInput.value = '';
        button.removeAttribute('disabled');
        feedBack.className = 'feedback text-success';
        break;
      }
      case 'failed': {
        urlInput.removeAttribute('disabled');
        button.removeAttribute('disabled');
        feedBack.className = 'feedback text-danger';
        break;
      }
      default: {
        break;
      }
    }
  }
  if (path.endsWith('processError') || path.endsWith('message')) {
    renderMessage(value);
  }
};

const renderValidation = (path, value) => {
  const { urlInput, feedBack } = getMemoizedDOMElems();
  if (path.endsWith('valid')) {
    if (value === true) {
      urlInput.classList.remove('is-invalid');
      feedBack.className = 'feedback';
      return;
    }
    urlInput.classList.add('is-invalid');
    feedBack.className = 'feedback text-danger';
  }
  if (path.endsWith('error')) {
    renderMessage(value);
  }
};

const createElement = (elem, content) => {
  const element = document.createElement(elem);
  element.append(...content);
  return element;
};

const renderData = (value) => {
  const container = document.querySelector('.feeds');
  container.innerHTML = '';
  const { feeds, posts } = value;
  const feedsItems = feeds.map(({ title, link }) => {
    const feedItemContent = createElement('a', [title]);
    feedItemContent.href = link;
    return createElement('h3', [feedItemContent]);
  });
  const feedsTitle = createElement('h2', 'Feeds list');
  const feedsList = createElement('ul', [feedsTitle, ...feedsItems]);
  container.prepend(feedsList);
  feeds.forEach(({ title, id }) => {
    const feedPosts = posts.filter((post) => post.id === id);
    const feedTitle = createElement('h2', [title]);
    const mappedPosts = feedPosts.map(({ title: postTitle, link }) => {
      const postLink = createElement('a', [postTitle]);
      postLink.href = link;
      const postItem = createElement('li', [postLink]);
      return postItem;
    });
    const feedList = createElement('ul', [feedTitle, ...mappedPosts]);
    container.append(feedList);
  });
};

export default (path, value) => {
  switch (true) {
    case path.startsWith('form'): {
      renderRegistration(path, value);
      break;
    }
    case path.startsWith('validation'): {
      renderValidation(path, value);
      break;
    }
    case path.startsWith('data'): {
      renderData(value);
      break;
    }
    default:
      break;
  }
};
