import {Flex} from 'antd';
import {IdentityHolderNotActivatedPanel} from 'frontend/src/components/pages/common/stub/IdentityHolderNotActivatedPanel';
import {InfoAlert} from 'frontend/src/components/widgets/alert/InfoAlert';
import {ExternalLinkToFAQAsQuestionMark} from 'frontend/src/components/widgets/ExternalLinkToFAQAsQuestionMark';
import {i18} from 'frontend/src/i18';

export const ContractNotActivatedAnonymousPage = () => {
    return (
        <Flex vertical gap={16}>
            <InfoAlert
                message={
                    <div>
                        <Flex justify="space-between" gap={8}>
                            <div className="gf-strong">{i18.contract.activation.notActivated.anonymous.title}</div>
                            <ExternalLinkToFAQAsQuestionMark fragment="activation" />
                        </Flex>
                        <div>{i18.contract.activation.notActivated.anonymous.description}</div>
                    </div>
                }
                large
            />
            <IdentityHolderNotActivatedPanel />
        </Flex>
    );
};
