// Copyleft (ɔ) 2017 The Caliopen contributors.
// Use of this source code is governed by a GNU AFFERO GENERAL PUBLIC
// license (AGPL) that can be found in the LICENSE file.

package objects

import "time"

type Discussion struct {
	Attachment_count int32         `cql:"attachment_count"         json:"attachment_count"`
	Date_insert      time.Time     `cql:"date_insert"              json:"date_insert"              formatter:"RFC3339Nano"`
	Date_update      time.Time     `cql:"date_update"              json:"date_update"              formatter:"RFC3339Nano"`
	Discussion_id    UUID          `cql:"discussion_id"            json:"discussion_id"            formatter:"rfc4122"`
	Importance_level int32         `cql:"importance_level"         json:"importance_level"`
	Participants     []Participant `cql:"participants"             json:"participants"`
	Privacy_index    int32         `cql:"privacy_index"            json:"privacy_index"`
	Tags             []string      `cql:"tags"                     json:"tags"`
	Text             string        `cql:"text"                     json:"text"`
	Total_count      int32         `cql:"total_count"              json:"total_count"`
	Unread_count     int32         `cql:"unread_count"             json:"unread_count"`
}
