import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Trans, withI18n } from '@lingui/react';
import classnames from 'classnames';
import {
  Spinner, Button, FieldErrors, CheckboxFieldGroup, SelectFieldGroup, TextFieldGroup,
  TextareaFieldGroup,
} from '../../../../components';

import {
  ERROR_UNABLE_READ_PRIVATE_KEY,
  ERROR_FINGERPRINTS_NOT_MATCH,
} from '../../../../services/openpgp-manager';

import {
  ERROR_NEED_PASSPHRASE,
  ERROR_WRONG_PASSPHRASE,
} from '../../../../services/encryption';

import './style.scss';

const FORM_TYPE_GENERATE = 'generate';
const FORM_TYPE_RAW = 'raw';

@withI18n()
class OpenPGPKeyForm extends Component {
  static propTypes = {
    emails: PropTypes.arrayOf(PropTypes.shape({})),
    onImport: PropTypes.func.isRequired,
    onGenerate: PropTypes.func.isRequired,
    onImportFormChange: PropTypes.func.isRequired,
    importForm: PropTypes.shape({}),
    isLoading: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node,
    i18n: PropTypes.shape({}).isRequired,
    cancel: PropTypes.func.isRequired,
  };

  static defaultProps = {
    emails: [],
    importForm: {},
    isLoading: false,
    className: undefined,
    children: undefined,
  };

  constructor(props) {
    super(props);
    this.state = {
      formType: FORM_TYPE_GENERATE,
      hasPassphrase: false,
      generateForm: {},
    };

    this.initTranslations();
  }

  componentWillMount() {
    this.emailOptions = this.props.emails.map(email => ({
      label: email.address,
      value: email.address,
    }));

    if (this.emailOptions.length === 1) {
      this.setState({
        generateForm: {
          email: this.emailOptions[0].value,
        },
      });
    }
  }

  handleSwitchFormType = (event) => {
    this.setState({
      formType: event.target.name,
    });
  }

  handleToggleHasPassprase = () => {
    this.setState(prevState => ({
      hasPassphrase: !prevState.hasPassphrase,
    }));
  }

  handleGenerateChanges = (event) => {
    const { name, value } = event.target;
    this.setState(prevState => ({
      generateForm: {
        ...prevState.generateForm,
        [name]: value,
      },
    }));
  }

  handleGenerateSubmit = (event) => {
    event.preventDefault();

    this.props.onGenerate(this.state.generateForm);
  }

  handleImportChanges = (event) => {
    const { name, value } = event.target;
    const { onImportFormChange } = this.props;

    onImportFormChange({ [name]: value });
  }

  handleImportSubmit = async (event) => {
    event.preventDefault();
    await this.props.onImport();
  }

  handleCancelForm = () => {
    this.props.cancel();
  }

  initTranslations() {
    const { i18n } = this.props;

    this.errorsLabels = {
      [ERROR_UNABLE_READ_PRIVATE_KEY]: i18n._('openpgp.feedback.unable-read-private-key', null, { defaults: 'Unable to read private key' }),
      [ERROR_FINGERPRINTS_NOT_MATCH]: i18n._('openpgp.feedback.fingerprints-not-match', null, { defaults: 'Fingerprints do not match' }),
      [ERROR_NEED_PASSPHRASE]: i18n._('openpgp.feedback.need-passphrase', null, { defaults: 'Passphrase is needed to retrieve public key' }),
      [ERROR_WRONG_PASSPHRASE]: i18n._('openpgp.feedback.wrong-passphrase', null, { defaults: 'Cannot decrypt with current passphrase' }),
    };
  }

  render() {
    // XXX: note on importForm, errors comes from props and form items from this.state since form is
    // not real time saved in redux store
    const {
      i18n, isLoading, className, children,
      importForm,
    } = this.props;
    const generateHollowProp = this.state.formType === FORM_TYPE_GENERATE ? { shape: 'hollow' } : {};
    const rawHollowProp = this.state.formType === FORM_TYPE_RAW ? { shape: 'hollow' } : {};

    return (
      <div className={classnames('m-account-openpgp-form', className)}>
        <div className="m-account-openpgp-form__main">
          {children}

          <div className="m-account-openpgp-form__switch-mode-container">
            <Button
              onClick={this.handleSwitchFormType}
              name={FORM_TYPE_GENERATE}
              {...generateHollowProp}
            >
              <Trans id="user.openpgp.action.switch-generate-key">Generate key</Trans>
            </Button>
            <Button
              onClick={this.handleSwitchFormType}
              name={FORM_TYPE_RAW}
              {...rawHollowProp}
            >
              <Trans id="user.openpgp.action.switch-import-raw-key">Import key</Trans>
            </Button>
          </div>
        </div>
        {this.state.formType === FORM_TYPE_GENERATE && (
          <form onSubmit={this.handleGenerateSubmit}>
            {
              this.emailOptions.length !== 1 && (
                <SelectFieldGroup
                  className="m-account-openpgp-form__field-group"
                  label={i18n._('user.openpgp.form.email.label', null, { defaults: 'Email' })}
                  value={this.state.generateForm.email}
                  onChange={this.handleGenerateChanges}
                  name="email"
                  options={this.emailOptions}
                  required="true"
                />
              )
            }
            {this.emailOptions.length === 1 && (
              <p className="m-account-openpgp-form__field-group">
                <Trans id="user.openpgp.form.email.label">Email</Trans>
                {' '}
                {this.state.generateForm.email}
              </p>
            )}
            <div className="m-account-openpgp-form__field-group">
              <Trans id="user.openpgp.has-passphrase">Enable passphrase</Trans>
              {' '}
              <CheckboxFieldGroup
                displaySwitch
                label={i18n._('user.openpgp.has-passphrase', null, { defaults: 'Enable passphrase' })}
                value={this.state.hasPassphrase}
                onChange={this.handleToggleHasPassprase}
              />
            </div>

            {this.state.hasPassphrase && (
              <div className="m-account-openpgp-form__field-group">
                <TextFieldGroup
                  label={i18n._('user.openpgp.form.passphrase.label', null, { defaults: 'Passphrase' })}
                  type="password"
                  value={this.state.generateForm.passphrase}
                  onChange={this.handleGenerateChanges}
                  name="passphrase"
                />
              </div>
            )}
            <div className="m-account-openpgp-form__field-group">
              <Button type="submit" shape="plain">
                <Spinner isLoading={isLoading} />
                {' '}
                <Trans id="user.openpgp.action.create">Create</Trans>
              </Button>
              <Button
                onClick={this.handleCancelForm}
                shape="hollow"
              >
                <Trans id="general.action.cancel">Cancel</Trans>
              </Button>
            </div>
          </form>
        )}
        {this.state.formType === FORM_TYPE_RAW && (
          <form onSubmit={this.handleImportSubmit}>
            {
              importForm.errors.global && (
                <FieldErrors
                  className="m-account-openpgp-form__field-group"
                  errors={importForm.errors.global.map(key => this.errorsLabels[key])}
                />
              )
             }

            <TextFieldGroup
              label={i18n._('user.openpgp.form.passphrase.label', null, { defaults: 'Passphrase' })}
              value={importForm.passphrase}
              onChange={this.handleImportChanges}
              name="passphrase"
              type="password"
            />
            <TextareaFieldGroup
              className="m-account-openpgp-form__field-group"
              label={i18n._('user.openpgp.form.private-key.label', null, { defaults: 'Private key' })}
              inputProps={{
                value: importForm.privateKeyArmored,
                onChange: this.handleImportChanges,
                name: 'privateKeyArmored',
              }}
            />
            {/*
              errors={
                importForm.errors.privateKeyArmored &&
                importForm.errors.privateKeyArmored.map(key => this.errorsLabels[key])
              }
              */}
            <Button
              className="m-account-openpgp-form__field-group"
              type="submit"
              shape="plain"
            >
              <Spinner isLoading={isLoading} />
              <Trans id="user.openpgp.action.add">Add</Trans>
            </Button>
          </form>
        )
      }
      </div>
    );
  }
}

export default OpenPGPKeyForm;
