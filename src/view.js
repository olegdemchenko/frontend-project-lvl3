import onChange from 'on-change';

const createElement = (elem, content) => {
  const element = document.createElement(elem);
  element.append(...content);
  return element;
};

const renderValidation = (valid, elements, messages) => {
  const { input, feedback } = elements;
  const { validationError } = messages;
  if (valid === true) {
    input.classList.remove('is-invalid');
    feedback.classList.remove('text-danger');
    feedback.textContent = '';
    return;
  }
  input.classList.add('is-invalid');
  feedback.className = 'feedback text-danger';
  feedback.textContent = validationError;
};

const renderProcessState = (value, elements, messages) => {
  const { input, button, feedback } = elements;
  const { waiting, success } = messages;
  switch (value) {
    case 'filling': {
      input.removeAttribute('disabled');
      input.value = '';
      button.removeAttribute('disabled');
      feedback.classList.remove('text-danger', 'text-success');
      feedback.textContent = '';
      break;
    }
    case 'sending': {
      input.setAttribute('disabled', '');
      button.setAttribute('disabled', '');
      feedback.classList.add('text-info');
      feedback.textContent = waiting;
      break;
    }
    case 'finished': {
      input.removeAttribute('disabled');
      input.value = '';
      button.removeAttribute('disabled');
      feedback.classList.remove('text-info');
      feedback.classList.add('text-success');
      feedback.textContent = success;
      break;
    }
    case 'failed': {
      input.removeAttribute('disabled');
      button.removeAttribute('disabled');
      feedback.classList.remove('text-info');
      feedback.classList.add('text-danger');
      break;
    }
    default: {
      throw new Error(`Unknown processState: ${value}`);
    }
  }
};

const renderFormSubState = (path, value, elements, messages) => {
  const { feedback } = elements;
  switch (true) {
    case path.endsWith('processState'): {
      renderProcessState(value, elements, messages);
      break;
    }
    case path.endsWith('valid'): {
      renderValidation(value, elements, messages);
      break;
    }
    case path.endsWith('error'): {
      feedback.textContent = value;
      break;
    }
    default:
      throw new Error(`Unknown path: ${path}`);
  }
};

const renderDataSubState = (value, { container }) => {
  // eslint-disable-next-line no-param-reassign
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

export default (elements, state, messages) => {
  const watchedState = onChange(state, (path, value) => {
    switch (true) {
      case path.startsWith('form'): {
        renderFormSubState(path, value, elements, messages);
        break;
      }
      case path.startsWith('data'): {
        renderDataSubState(value, elements);
        break;
      }
      default:
        throw new Error(`unexpected path: ${path}`);
    }
  });
  return watchedState;
};
