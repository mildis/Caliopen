import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { i18nMark, withI18n, Trans } from '@lingui/react';
import {
  Button, Icon, InputText, TextareaFieldGroup, TextFieldGroup, Link, Confirm, PlaceholderBlock,
  Callout, FieldErrors, Spinner,
} from '../../../../components';
import { LockedMessage } from '../../../../modules/encryption';
import { identityToParticipant } from '../../../../modules/identity';
import { withScrollTarget } from '../../../../modules/scroll';
import { withUser } from '../../../../modules/user';
import { withNotification } from '../../../../modules/userNotify';
import { getRecipients } from '../../../../services/message';
import { STATUS_DECRYPTED, STATUS_ERROR } from '../../../../store/modules/encryption';
import RecipientList from '../RecipientList';
import AttachmentManager from '../AttachmentManager';
import IdentitySelector from '../IdentitySelector';
import { getIdentityProtocol } from '../../services/getIdentityProtocol';

import './draft-message-quick.scss';
import './draft-message-advanced.scss';
import './draft-message-placeholder.scss';
import './toggle-advanced-draft-button.scss';

const PROTOCOL_EMAIL = 'email';

@withUser()
@withI18n()
@withNotification()
@withScrollTarget()
class DraftMessage extends Component {
  static propTypes = {
    notifyError: PropTypes.func.isRequired,
    className: PropTypes.string,
    isReply: PropTypes.bool,
    i18n: PropTypes.shape({}).isRequired,
    availableIdentities: PropTypes.arrayOf(PropTypes.shape({})),
    scrollTarget: PropTypes.shape({ forwardRef: PropTypes.func }).isRequired,
    internalId: PropTypes.string.isRequired,
    draftMessage: PropTypes.shape({
      user_identities: PropTypes.arrayOf(PropTypes.string),
    }),
    requestDraft: PropTypes.func.isRequired,
    original: PropTypes.shape({}),
    onEditDraft: PropTypes.func.isRequired,
    // onSaveDraft: PropTypes.func.isRequired,
    onSendDraft: PropTypes.func.isRequired,
    canEditRecipients: PropTypes.bool,
    parentMessage: PropTypes.shape({}),
    // useful for invalidate discussion collection messages
    onSent: PropTypes.func,
    onDeleteMessage: PropTypes.func.isRequired,
    onDeleteMessageSuccessfull: PropTypes.func,
    onUploadAttachments: PropTypes.func.isRequired,
    onDeleteAttachement: PropTypes.func.isRequired,
    draftFormRef: PropTypes.func,
    onFocus: PropTypes.func,
    isFetching: PropTypes.bool,
    // required in redux selector and withDraftMessage …
    hasDiscussion: PropTypes.bool.isRequired,
    isEncrypted: PropTypes.bool,
    encryptionStatus: PropTypes.string,
    draftEncryption: PropTypes.shape({
      status: PropTypes.string.isRequired,
    }),
    userState: PropTypes.shape({
      user: PropTypes.shape({}).isRequired,
    }).isRequired,
  };

  static defaultProps = {
    className: undefined,
    availableIdentities: [],
    isReply: false,
    draftMessage: undefined,
    original: undefined,
    canEditRecipients: false,
    parentMessage: undefined,
    draftFormRef: () => {},
    onFocus: () => {},
    onSent: () => {},
    onDeleteMessageSuccessfull: () => {},
    isFetching: true,
    isEncrypted: false,
    draftEncryption: undefined,
    encryptionStatus: undefined,
  };

  static genererateStateFromProps(props, prevState) {
    const {
      draftMessage, isReply, availableIdentities, isFetching,
      isEncrypted, draftEncryption, encryptionStatus,
    } = props;

    if (!draftMessage) {
      return prevState;
    }

    const isLocked = isEncrypted && ![STATUS_DECRYPTED, STATUS_ERROR].includes(encryptionStatus);
    const { body } = (isEncrypted && encryptionStatus && encryptionStatus === STATUS_DECRYPTED) ?
      draftEncryption.decryptedMessage : draftMessage;

    const recipients = getRecipients(draftMessage);
    const identityId = (draftMessage.user_identities && draftMessage.user_identities[0]) || '';

    const currIdentity = availableIdentities.find(identity => identity.identity_id === identityId);

    return {
      initialized: !isFetching && !isLocked,
      advancedForm: !isReply || !currIdentity,
      draftMessage: {
        ...prevState.draftMessage,
        body,
        subject: draftMessage.subject,
        identityId,
        recipients,
      },
    };
  }

  static getDraftFromState(state, props) {
    const { availableIdentities, userState: { user } } = props;
    const currIdentity = availableIdentities
      .find(identity => identity.identity_id === state.draftMessage.identityId);
    const recipients = state.draftMessage.recipients ? state.draftMessage.recipients : [];

    return {
      ...props.draftMessage,
      body: state.draftMessage.body,
      subject: state.draftMessage.subject,
      user_identities: [currIdentity.identity_id],
      participants: [
        identityToParticipant({ identity: currIdentity, user }),
        ...recipients,
      ],
    };
  }

  static initialState = {
    initialized: false,
    isLocked: false,
    advancedForm: true,
    isSending: false,
    draftMessage: {
      body: '',
      identityId: '',
      subject: '',
      recipients: [],
    },
  };

  state = this.constructor.genererateStateFromProps(this.props, this.constructor.initialState);

  componentDidUpdate(prevProps) {
    const propNames = ['draftMessage', 'isReply', 'availableIdentities', 'isFetching', 'encryptionStatus'];
    const hasChanged = propNames.some(propName => this.props[propName] !== prevProps[propName]);

    if (!this.state.initialized && hasChanged) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(prevState => this.constructor.genererateStateFromProps(this.props, prevState));
    }
  }

  getRecipientList = () => {
    const { draftMessage } = this.props;

    // participants may not be present when the draft is new, it is the responsibility of the
    // backend to calculate what will be the participants for a reply
    if (!draftMessage || !draftMessage.participants) {
      return null;
    }

    const recipients = getRecipients(draftMessage);

    if (recipients.length > 3) {
      return recipients.map(recipient => recipient.address).join(', ').concat('...');
    }

    return recipients.map(recipient => recipient.address).join(', ');
  }

  getQuickInputPlaceholder = () => {
    const { i18n, draftMessage, availableIdentities } = this.props;

    const [identityId] = draftMessage && draftMessage.user_identities ?
      draftMessage.user_identities : [];
    const { identifier } = availableIdentities
      .find(identity => identity.identity_id === identityId) || {};

    const recipientsList = this.getRecipientList();

    if (draftMessage && draftMessage.discussion_id && recipientsList && identifier) {
      return i18n._('draft-message.form.placeholder.quick-reply', { recipients: recipientsList, protocol: identifier }, { defaults: 'Quick reply to {recipients} from {protocol}' });
    }

    if (draftMessage && draftMessage.discussion_id && identifier) {
      return i18n._('draft-message.form.placeholder.quick-reply-no-recipients', { identifier }, { defaults: 'Quick reply from {identifier}' });
    }

    return i18n._('draft-message.form.placeholder.quick-start', null, { defaults: 'Start a new discussion' });
  }

  getIdentity = () => this.props.availableIdentities
    .find(ident => ident.identity_id === this.state.draftMessage.identityId);

  getCanSend = () => {
    const { isReply } = this.props;
    const errors = this.validate();
    const isValid = errors.length === 0;
    const hasRecipients = this.state.draftMessage.recipients &&
      this.state.draftMessage.recipients.length > 0;

    return (isReply || hasRecipients) && !this.state.isSending && isValid;
  }

  getEncryptionTranslation = () => {
    const { isEncrypted, encryptionStatus } = this.props;

    const encryptionEnabled = isEncrypted && encryptionStatus === STATUS_DECRYPTED;

    return encryptionEnabled ?
      i18nMark('draft-message.encryption.ok') :
      i18nMark('draft-message.encryption.ko');
  };

  validate = () => {
    const currentDraft = this.state.draftMessage;
    const identity = this.getIdentity();

    if (!identity) {
      return [
        (<Trans id="draft-message.errors.missing-identity">An identity is mandatory to send a message</Trans>),
      ];
    }

    const protocol = getIdentityProtocol(identity);

    if (
      currentDraft.recipients &&
      currentDraft.recipients.some(participant => participant.protocol !== protocol)
    ) {
      return [
        (
          <Trans
            id="draft-message.errors.invalid-participant"
            values={{ protocol }}
            defaults="According to your identity, all your participants must use a {protocol} address to contact them all together"
          />
        ),
      ];
    }

    return [];
  }

  handleToggleAdvancedForm = () => {
    this.setState(prevState => ({
      advancedForm: !prevState.advancedForm,
    }));
  }

  handleChange = (ev) => {
    const { name, value } = ev.target;

    this.setState((prevState) => {
      const draftMessage = {
        ...prevState.draftMessage,
        [name]: value,
      };

      return {
        draftMessage,
        hasChanged: true,
      };
    }, () => {
      const { internalId, original, onEditDraft } = this.props;

      return onEditDraft({
        internalId,
        draft: this.constructor.getDraftFromState(this.state, this.props),
        message: original,
      });
    });
  }

  // @deprecated: saving button has been removed
  // handleSave = async ({ draft }) => {
  //   const {
  //     internalId, message, notifySuccess, notifyError, i18n, onSaveDraft,
  //   } = this.props;
  //
  //   try {
  //     await onSaveDraft({ draft, message, internalId });
  //
  //     return notifySuccess({ message: i18n._('draft.feedback.saved', null, { defaults: 'Draft
  //     saved' }) });
  //   } catch (err) {
  //     return notifyError({
  //       message: i18n._('draft.feedback.save-error', null, { defaults: 'Unable to save the draft'
  //       }),
  //     });
  //   }
  // }

  handleSend = async () => {
    const {
      onSendDraft, internalId, original, notifyError, i18n, onSent, requestDraft, hasDiscussion,
    } = this.props;

    this.setState({ isSending: true });

    try {
      const message = await onSendDraft({
        draft: this.constructor.getDraftFromState(this.state, this.props),
        message: original,
        internalId,
      });

      this.setState({
        initialized: false,
        draftMessage: undefined,
      });

      if (hasDiscussion) {
        await requestDraft({ internalId, hasDiscussion });
      }

      this.setState({ isSending: false });
      onSent({ message });
    } catch (err) {
      notifyError({
        message: i18n._('draft.feedback.send-error', null, { defaults: 'Unable to send the message' }),
      });
      this.setState({ isSending: false });
    }
  }

  handleDelete = async () => {
    const {
      original, internalId, onDeleteMessage, onDeleteMessageSuccessfull, requestDraft,
      hasDiscussion,
    } = this.props;

    await onDeleteMessage({ message: original, internalId });
    this.setState({
      initialized: false,
      draftMessage: undefined,
    });

    if (hasDiscussion) {
      await requestDraft({ internalId, hasDiscussion });
    }
    onDeleteMessageSuccessfull();
  }

  // @deprecated: edit tags button has been removed
  // handleTagsChange = async ({ tags }) => {
  //   const {
  //     onUpdateEntityTags, i18n, message, draft, discussionId,
  //   } = this.props;
  //
  //   return onUpdateEntityTags(discussionId, i18n, message, { type: 'message', entity: draft, tags
  //   });
  // }

  handleFilesChange = async ({ attachments }) => {
    const {
      onUploadAttachments, i18n, original, internalId,
    } = this.props;

    return onUploadAttachments(internalId, i18n, original, {
      draft: this.constructor.getDraftFromState(this.state, this.props),
      attachments,
    });
  }

  handleDeleteAttachement = (attachment) => {
    const {
      onDeleteAttachement, i18n, original, internalId,
    } = this.props;

    return onDeleteAttachement(internalId, i18n, original, {
      draft: this.constructor.getDraftFromState(this.state, this.props),
      attachment,
    });
  }

  handleIdentityChange = ({ identity = {} }) => {
    this.setState(prevState => ({
      draftMessage: {
        ...prevState.draftMessage,
        identityId: identity.identity_id,
      },
    }), () => {
      const { internalId, original, onEditDraft } = this.props;

      return onEditDraft({
        internalId,
        draft: this.constructor.getDraftFromState(this.state, this.props),
        message: original,
      });
    });
  }

  handleRecipientsChange = (recipients) => {
    this.setState(prevState => ({
      draftMessage: {
        ...prevState.draftMessage,
        // no need to merge author, backend does it
        recipients,
      },
      hasChanged: true,
    }), () => {
      const { internalId, original, onEditDraft } = this.props;

      return onEditDraft({
        internalId,
        draft: this.constructor.getDraftFromState(this.state, this.props),
        message: original,
      });
    });
  }

  renderPlaceholder() {
    const {
      className, draftFormRef, scrollTarget: { forwardRef },
    } = this.props;

    const ref = (el) => {
      draftFormRef(el);
      forwardRef(el);
    };

    return (
      <div ref={ref}>
        <PlaceholderBlock className={classnames(className, 'm-draft-message-placeholder')} />
      </div>
    );
  }

  renderToggleAdvancedButton() {
    const { i18n } = this.props;
    const caretType = this.state.advancedForm ? 'caret-up' : 'caret-down';

    return (
      <Button
        display="expanded"
        shape="plain"
        className="m-toggle-advanced-draft-button"
        title={i18n._('draft-message.action.toggle-advanced', null, { defaults: 'Toggle advanced or quick message form' })}
        onClick={this.handleToggleAdvancedForm}
      >
        <Icon type="envelope" />
        <Icon type={caretType} />
      </Button>
    );
  }

  renderRecipientList({ className } = {}) {
    const { canEditRecipients } = this.props;

    if (canEditRecipients) {
      const { internalId } = this.props;
      const identity = this.getIdentity();

      return (
        <RecipientList
          className={className}
          internalId={internalId}
          recipients={this.state.draftMessage.recipients}
          onRecipientsChange={this.handleRecipientsChange}
          identity={identity}
        />
      );
    }

    return null;
  }

  renderQuick() {
    const {
      className, i18n, draftFormRef, onFocus, scrollTarget: { forwardRef },
      draftEncryption, isEncrypted, encryptionStatus,
    } = this.props;
    const ref = (el) => {
      draftFormRef(el);
      forwardRef(el);
    };

    const encryptionEnabled = isEncrypted && encryptionStatus === STATUS_DECRYPTED;

    const canSend = this.getCanSend();

    return (
      <div className={classnames(className, 'm-draft-message-quick')} ref={ref}>
        <div className={classnames(className, 'm-draft-message-quick__container')}>
          <div className="m-draft-message-quick__toggle-advanced">
            {this.renderToggleAdvancedButton()}
          </div>
          {
            this.state.isLocked ?
              <LockedMessage encryptionStatus={draftEncryption} />
              : (
                <InputText
                  className={classnames(
                    'm-draft-message-quick__input',
                    { 'm-draft-message-quick__input--encrypted': encryptionEnabled }
                  )}
                  onChange={this.handleChange}
                  onFocus={onFocus}
                  name="body"
                  value={this.state.draftMessage.body}
                  placeholder={this.getQuickInputPlaceholder()}
                />
              )}
          <div className={classnames(
            'm-draft-message-quick__send',
            {
              'm-draft-message-quick__send--encrypted': encryptionEnabled,
              'm-draft-message-quick__send--unencrypted': !encryptionEnabled,
            }
          )}
          >
            <Button
              display="expanded"
              shape="plain"
              icon="paper-plane"
              title={i18n._('draft-message.action.send', null, { defaults: 'Send' })}
              className={classnames(
                'm-draft-message-quick__send-button',
                {
                  'm-draft-message-quick__send-button--encrypted': encryptionEnabled,
                  'm-draft-message-quick__send-button--unencrypted': !encryptionEnabled,
                }
              )}
              onClick={this.handleSend}
              disabled={!canSend}
            />
          </div>
        </div>
        <div className="m-draft-message-quick__encryption">
          <Trans id={this.getEncryptionTranslation()} />
        </div>
      </div>
    );
  }

  renderAdvanced() {
    const {
      className, draftMessage, parentMessage, original, draftFormRef, isReply, availableIdentities,
      onFocus, scrollTarget: { forwardRef }, encryptionStatus,
      draftEncryption, isEncrypted,
    } = this.props;

    const encryptionEnabled = isEncrypted && encryptionStatus === STATUS_DECRYPTED;

    const isSubjectSupported = ({ draft }) => {
      if (!draft.identityId) {
        return false;
      }

      const currIdentity = availableIdentities
        .find(ident => ident.identity_id === draft.identityId);

      if (!currIdentity) {
        return false;
      }

      return getIdentityProtocol(currIdentity) === PROTOCOL_EMAIL;
    };

    const hasSubject = isSubjectSupported({ draft: this.state.draftMessage });
    const ref = (el) => {
      draftFormRef(el);
      forwardRef(el);
    };

    const errors = this.validate();
    const canSend = this.getCanSend();

    return (
      <div className={classnames(className, 'm-draft-message-advanced')} ref={ref}>
        <div className="m-draft-message-advanced__toggle-simple">
          {isReply && this.renderToggleAdvancedButton()}
        </div>
        <div className="m-draft-message-advanced__container">
          <IdentitySelector
            className="m-draft-message-advanced__identity"
            identities={availableIdentities}
            identityId={this.state.draftMessage.identityId}
            onChange={this.handleIdentityChange}
          />
          {this.renderRecipientList({ className: 'm-draft-message-advanced__recipient-list' })}
          {parentMessage && (
            <div className="m-reply__parent">
              <Link to={`#${parentMessage.message_id}`} className="m-reply__parent-link">
                <Trans
                  id="reply-form.in-reply-to"
                  values={{ 0: parentMessage.excerpt }}
                  defaults="In reply to: {0}"
                />
              </Link>
            </div>
          )}
          {!isReply && hasSubject && (
            <TextFieldGroup
              className="m-draft-message-advanced__subject"
              display="inline"
              label={<Trans id="messages.compose.form.subject.label">Subject</Trans>}
              name="subject"
              value={this.state.draftMessage.subject}
              onChange={this.handleChange}
            />
          )}
          {
            this.state.isLocked ?
              <LockedMessage encryptionStatus={draftEncryption} />
              : (
                <TextareaFieldGroup
                  className="m-draft-advanced__body"
                  label={<Trans id="messages.compose.form.body.label">Type your message here...</Trans>}
                  showLabelForSR
                  inputProps={{
                    name: 'body',
                    onChange: this.handleChange,
                    onFocus,
                    value: this.state.draftMessage.body,
                  }}
                />
              )}
          <AttachmentManager
            className="m-draft-message-advanced__attachments"
            onUploadAttachments={this.handleFilesChange}
            onDeleteAttachement={this.handleDeleteAttachement}
            message={draftMessage}
          />
        </div>
        <div className="m-draft-message-advanced__action-send">
          {original && (
            <Confirm
              onConfirm={this.handleDelete}
              title={(<Trans id="message-list.message.confirm-delete.title">Delete a message</Trans>)}
              content={(<Trans id="message-list.message.confirm-delete.content">The deletion is permanent, are you sure you want to delete this message ?</Trans>)}
              render={confirm => (
                <Button
                  onClick={confirm}
                  icon="trash"
                  color="alert"
                  className="m-draft-message-advanced__action-button"
                >
                  <Trans id="message-list.message.action.delete">Delete</Trans>
                </Button>
              )}
            />
          )}
          <Button
            shape="plain"
            className={classnames(
              'm-draft-message-advanced__action-button',
              'm-draft-message-advanced__button-send',
              {
                'm-draft-message-advanced__button-send--encrypted': encryptionEnabled,
                'm-draft-message-advanced__button-send--unencrypted': !encryptionEnabled,
              }
            )}
            onClick={this.handleSend}
            disabled={!canSend}
          >
            {this.state.isSending && (<Spinner display="inline" theme="bright" />)}
            {!this.state.isSending && (<Icon type="laptop" />)}
            {' '}
            ---
            {' '}
            <Icon type="user" />
            {' '}
            <Trans id="draft-message.action.send">Send</Trans>
          </Button>
        </div>
        {errors.length > 0 && (
          <div className="m-draft-message-advanced__errors">
            <FieldErrors errors={errors} />
          </div>
        )}
        <div className="m-draft-message-advanced__encryption">
          <Trans id={this.getEncryptionTranslation()} />
        </div>
      </div>
    );
  }

  render() {
    if (!this.state.initialized) {
      return this.renderPlaceholder();
    }

    const {
      availableIdentities, className, draftFormRef, scrollTarget: { forwardRef },
    } = this.props;

    if (availableIdentities.length === 0) {
      const ref = (el) => {
        draftFormRef(el);
        forwardRef(el);
      };

      return (
        <div className={classnames(className)} ref={ref}>
          <Callout color="info">
            <Trans
              id="draft-message.no-available-identities"
              defaults="You have no available identities for this discussion. You can add one in your <0>account</0>"
              components={[
                <Link to="/user/identities" />,
              ]}
            />
          </Callout>
        </div>
      );
    }

    return this.state.advancedForm ? this.renderAdvanced() : this.renderQuick();
  }
}

export default DraftMessage;
