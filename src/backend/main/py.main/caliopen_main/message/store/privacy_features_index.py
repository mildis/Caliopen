# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import logging

import elasticsearch_dsl as dsl

log = logging.getLogger(__name__)


class IndexedPrivacyFeatures(dsl.InnerObjectWrapper):

    """privacy features indexed model."""

    empty_is_boring = dsl.Boolean()
