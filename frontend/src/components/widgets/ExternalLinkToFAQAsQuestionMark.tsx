import {QuestionCircleOutlined} from '@ant-design/icons';
import {type FAQFragment} from '../pages/skeleton/Router';
import {ExternalLinkToFAQ} from './ExternalLinkToFAQ';

type Props = {
    fragment: FAQFragment;
};
export const ExternalLinkToFAQAsQuestionMark = (props: Props) => {
    return <ExternalLinkToFAQ fragment={props.fragment} label={<QuestionCircleOutlined />} />;
};
