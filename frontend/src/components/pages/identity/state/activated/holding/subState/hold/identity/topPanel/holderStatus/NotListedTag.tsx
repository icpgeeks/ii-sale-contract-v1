import {Tag} from 'antd';
import {i18} from 'frontend/src/i18';

export const NotListedTag = () => <Tag color="orange">{i18.holder.state.holding.common.topPanel.saleStatus.notListed}</Tag>;
