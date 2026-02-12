import {Flex, Steps} from 'antd';
import {WarningAlert} from 'frontend/src/components/widgets/alert/WarningAlert';
import {i18} from 'frontend/src/i18';
import {type ReactNode} from 'react';

const textBlockStyle = {lineHeight: 'var(--ant-line-height)', padding: '5px 0'};

export const StepsComponent = ({link, input}: {link: ReactNode; input: ReactNode}) => {
    return (
        <Steps
            direction="vertical"
            progressDot={true}
            items={[
                {
                    title: (
                        <Flex vertical gap={8}>
                            <div style={textBlockStyle}>
                                <div>{i18.holder.state.release.waitingAuthnMethodRegistration.steps.openLink}</div>
                                {link}
                            </div>
                            <Warning />
                        </Flex>
                    ),
                    status: 'finish'
                },
                {
                    title: <div style={textBlockStyle}>{i18.holder.state.release.waitingAuthnMethodRegistration.steps.enterCode}</div>,
                    description: <div style={{margin: '0 2px'}}>{input}</div>,
                    status: 'finish'
                },
                {
                    title: <div style={textBlockStyle}>{i18.holder.state.release.waitingAuthnMethodRegistration.steps.clickNext}</div>,
                    status: 'finish'
                }
            ]}
        />
    );
};

const Warning = () => {
    return <WarningAlert message={i18.holder.state.release.waitingAuthnMethodRegistration.warning} />;
};
