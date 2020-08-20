import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'core-js/es/promise';
import 'core-js/es/set';
import 'core-js/es/map';
import promise from './app/application';

promise.then((app) => app());
