import {isNullish} from '@dfinity/utils';
import {Flex} from 'antd';
import {InfoAlert} from 'frontend/src/components/widgets/alert/InfoAlert';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {useAuthContext} from 'frontend/src/context/auth/AuthProvider';
import {useIdentityHolderStateContext} from 'frontend/src/context/identityHolder/state/IdentityHolderStateProvider';
import {i18} from 'frontend/src/i18';

export const AnonymousValidationBanner = () => {
    const {isAuthenticated} = useAuthContext();
    const {stateUnion} = useIdentityHolderStateContext();

    if (isAuthenticated) {
        return null;
    }

    if (isNullish(stateUnion?.type) || stateUnion?.type == 'WaitingActivation') {
        return null;
    }

    return (
        <div className="skBanner">
            <InfoAlert
                message={
                    <div>
                        <Flex justify="space-between" gap={8}>
                            <div className="gf-strong">{i18.banner.validate.title}</div>
                            <ExternalLinkToFAQAsQuestionMark fragment="validation" />
                        </Flex>
                        <div>{i18.banner.validate.description}</div>
                    </div>
                }
                large
            />
        </div>
    );
};
