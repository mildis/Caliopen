import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Trans } from '@lingui/macro'; // eslint-disable-line import/no-extraneous-dependencies
import {
  Section, Callout, Icon, Title,
} from '../../../../components';
import { PROVIDER_GMAIL, PROVIDER_TWITTER } from '../../../../modules/remoteIdentity';
import RemoteIdentityEmail from '../RemoteIdentityEmail';
import AuthButton from '../AuthButton';
import ProviderButtonContainer from '../ProviderButtonContainer';
import ProviderButton from '../ProviderButton';
import './provider-list.scss';
import './new-identity.scss';
import './provider-email-button.scss';

class NewIdentity extends Component {
  static propTypes = {
    onRemoteIdentityChange: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
  };

  static defaultProps = {
  };

  state = {
    emailFormOpened: false,
  };

  handleToggleFormEmail = () => {
    this.setState(prevState => ({
      emailFormOpened: !prevState.emailFormOpened,
    }));
  }

  handleChangeRemoteIdentityEmail = async (...params) => {
    const { onRemoteIdentityChange } = this.props;
    await onRemoteIdentityChange(...params);
    this.handleToggleFormEmail();
    this.props.onClear();
  }

  handleOAuthDone = () => {
    this.props.onClear();
  }

  render() {
    return (
      <Section
        title={(<Trans id="remote_identity.add_account">Add an external account</Trans>)}
        titleProps={{ size: 'large' }}
        className="m-new-identity"
        shape="none"
      >
        <p className="m-new-identity__main-help">
          <Trans id="remote_identity.create_help">
            Add an external account will allow you to aggregate messages for this account in your
            Caliopen inbox and answer to your contacts using one of these acounts.
          </Trans>
        </p>
        <Callout color="info">
          <Trans id="remote_identity.how_to">
            <p>
              External accounts are fetched every 15 minutes.
              <br />
              Currently there is no indicator to inform that the account is correctly configured
              until first try is done.
            </p>
          </Trans>
        </Callout>
        <Title hr>
          <Trans id="remote_identity.choose-provider.title">Select a provider</Trans>
        </Title>
        <ul className="m-provider-list">
          <li className="m-provider-list__provider">
            <ProviderButtonContainer label={(<Trans id="remote_identity.gmail.help">You will be redirected to gmail authentication</Trans>)}>
              <AuthButton onDone={this.handleOAuthDone} providerName={PROVIDER_GMAIL} />
            </ProviderButtonContainer>
          </li>
          <li className="m-provider-list__provider">
            <ProviderButtonContainer label={(<Trans id="remote_identity.twitter.help">You will be redirected to twitter authentication and authorize the application</Trans>)}>
              <AuthButton onDone={this.handleOAuthDone} providerName={PROVIDER_TWITTER} />
            </ProviderButtonContainer>
          </li>
          <li className="m-provider-list__provider">
            <ProviderButtonContainer label={(<Trans id="remote_identity.email.help">You will have to fill the form with your imap server&apos;s parameters</Trans>)}>
              <ProviderButton onClick={this.handleToggleFormEmail}>
                <Icon className="m-provider-email-button__icon" type="email" rightSpaced />
                <Trans id="remote_identity.action.toggle-email-form">Email (via IMAP)</Trans>
              </ProviderButton>
            </ProviderButtonContainer>
          </li>
        </ul>
        {this.state.emailFormOpened && (
          <RemoteIdentityEmail
            className="m-new-identity__email-form"
            onChange={this.handleChangeRemoteIdentityEmail}
            onCancel={this.handleToggleFormEmail}
          />
        )}
      </Section>
    );
  }
}

export default NewIdentity;
