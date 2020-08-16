import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'core-js/es/promise';
import 'core-js/es/set';
import 'core-js/es/map';
import promise from './application';

promise.then((app) => app());
