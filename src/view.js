import onChange from 'on-change';

const createElement = (elem, content) => {
  const element = document.createElement(elem);
  element.append(...content);
  return element;
};

const showMessage = (message, elem) => {
  elem.textContent = message;
};

const renderValidation = (value, elements, messages) => {
  const { input, feedback } = elements;
  const { validationError } = messages;
  if (value === true) {
    input.classList.remove('is-invalid');
    feedback.className = 'feedback';
    showMessage('', feedback);
    return;
  }
  input.classList.add('is-invalid');
  feedback.className = 'feedback text-danger';
  showMessage(validationError, feedback);
};

const renderProcessState = (value, elements, messages) => {
  const { input, button, feedback } = elements;
  const { waiting, success } = messages;
  switch (value) {
    case 'filling': {
      input.removeAttribute('disabled');
      input.value = '';
      button.removeAttribute('disabled');
      showMessage('', feedback);
      break;
    }
    case 'sending': {
      input.setAttribute('disabled', '');
      button.setAttribute('disabled', '');
      feedback.className = 'feedback text-info';
      showMessage(waiting, feedback);
      break;
    }
    case 'finished': {
      input.removeAttribute('disabled');
      input.value = '';
      button.removeAttribute('disabled');
      feedback.className = 'feedback text-success';
      showMessage(success, feedback);
      break;
    }
    case 'failed': {
      input.removeAttribute('disabled');
      button.removeAttribute('disabled');
      feedback.className = 'feedback text-danger';
      break;
    }
    default: {
      throw new Error(`Unknown processState: ${value}`);
    }
  }
};

const renderFormSubState = (path, value, elements, messages) => {
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
      showMessage(value, elements.feedback);
      break;
    }
    default:
      throw new Error(`Unknown path: ${path}`);
  }
};

const renderDataSubState = (value, { container }) => {
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
