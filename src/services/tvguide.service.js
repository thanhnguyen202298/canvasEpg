import { ApiHelper } from '../core/helpers';

export const serviceGetChannels = (params) => {
  const { model_external_id, filter_unsupported_channels, client } =
    params || {};
  return ApiHelper.api().get('/GetChannelList', null, {
    params: {
      model_external_id: model_external_id ? model_external_id : 'PC',
      filter_unsupported_channels: filter_unsupported_channels
        ? filter_unsupported_channels
        : true,
      client: client ? client : 'json',
    },
  });
};

export const serviceGetProgramList = ({ newListChannel = [], date }) => {
  const data = newListChannel.join(';');
  const dateNow = new Date(date);
  dateNow.setHours(0, 0, 0);
  const startDate = dateNow.getTime();

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const endDate = end.getTime();

  console.log('req', startDate, endDate, data);
  return ApiHelper.api().get(
    `/GetProgramLists?client=json&start_date=${startDate}&end_date=${endDate}&partial=true&channel_external_ids=${data}`,
  );
};

const TVGuideServices = {
  serviceGetChannels,
  serviceGetProgramList,
};

export default TVGuideServices;
