import { get, isEmpty } from 'lodash';
import Axios from 'axios';
import QueryString from 'query-string';
import { APIConfigKey } from '../../configs';

const enpoint = `${APIConfigKey.API_URL}`;

const ContentType = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  FORM_DATA: 'multipart/form-data',
};

const buildRequestHeader = async (
  requiredToken = false,
  contentType = ContentType.JSON,
) => {
  let header = {
    ['Content-Type']: contentType,
  };
  if (requiredToken) {
    const token = 'fake token'; //await AppConfig.shared().getToken();
    if (!isEmpty(token)) {
      header = { ...header, Authorization: `Bearer ${token}` };
    }
  }
  return header;
};

const headers = buildRequestHeader();

const defaultOptions = { headers };

export class ApiHelper {
  static instanc = ApiHelper;

  request = Axios.create({
    timeout: 60 * 1000,
    paramsSerializer: (params) =>
      QueryString.stringify(params, { arrayFormat: 'none' }),
  });

  constructor() {
    this.request.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(get(error, 'response.data', error)),
    );
  }

  static api() {
    if (!ApiHelper.instance) {
      ApiHelper.instance = new ApiHelper();
    }
    return ApiHelper.instance;
  }

  async get(path = '', data = {}, options = { ...defaultOptions }) {
    const response = await this.request.get(enpoint + path, options);
    return response;
  }

  async post(path = '', data = {}, options = { ...defaultOptions }) {
    const response = await this.request.post(enpoint + path, data, options);
    return response;
  }

  async put(path = '', data = {}, options = { ...defaultOptions }) {
    const response = await this.request.put(enpoint + path, data, options);
    return response;
  }

  async patch(path = '', data = {}, options = { ...defaultOptions }) {
    const response = await this.request.patch(enpoint + path, data, options);
    return response;
  }

  async delete(path = '', data = {}, options = { ...defaultOptions }) {
    const response = await this.request.delete(enpoint + path, options);
    return response;
  }

  // useRequest((resolve, reject) )  => this.request.interceptors.request.use(resolve, reject));

  // useResponse = (resolve, reject) => this.request.interceptors.response.use(resolve, reject);
}
