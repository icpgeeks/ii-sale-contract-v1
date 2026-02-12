import {type ReactNode} from 'react';
import {RouterPaths, type FAQFragment} from '../pages/skeleton/Router';
import {ExternalLink} from './ExternalLink';

type Props = {
    fragment: FAQFragment;
    className?: string;
    label: ReactNode;
};
export const ExternalLinkToFAQ = (props: Props) => {
    return (
        <ExternalLink href={RouterPaths.externalFAQPage(props.fragment)} className={props.className}>
            {props.label}
        </ExternalLink>
    );
};
