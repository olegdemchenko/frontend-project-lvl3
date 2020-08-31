import onChange from 'on-change';

const createElement = (elem, content) => {
  const element = document.createElement(elem);
  element.append(...content);
  return element;
};

export default (elements, state) => {
  const renderFormSubState = (path, value, { feedback, input, button }) => {
    if (path.endsWith('processState')) {
      switch (value) {
        case 'filling': {
          input.removeAttribute('disabled');
          input.value = '';
          button.removeAttribute('disabled');
          break;
        }
        case 'sending': {
          input.setAttribute('disabled', '');
          button.setAttribute('disabled', '');
          feedback.className = 'feedback text-info';
          break;
        }
        case 'finished': {
          input.removeAttribute('disabled');
          input.value = '';
          button.removeAttribute('disabled');
          feedback.className = 'feedback text-success';
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
    }
    if (path.endsWith('valid')) {
      if (value === true) {
        input.classList.remove('is-invalid');
        feedback.className = 'feedback';
        return;
      }
      input.classList.add('is-invalid');
      feedback.className = 'feedback text-danger';
    }
    if (path.includes('additionalInfo')) {
      feedback.textContent = value;
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

  const watchedState = onChange(state, (path, value) => {
    switch (true) {
      case path.startsWith('form'): {
        renderFormSubState(path, value, elements);
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
