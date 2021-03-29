#!/usr/bin/env bash
# use to modify/reset configs during development

action=$1

if [[ "$action" == "edit" ]]; then
atom  \
/home/phil/github/lshud-volume/config.json \
/home/phil/github/lshud-settings/config.json \
/home/phil/github/lshud-template/config.json
fi

if [[ "$action" == "clear" ]]; then
echo "clearing configs in .linux-system-hud/hdef/ "
cd /home/phil/.linux-system-hud/hdef
ls -a
rm *
ls -a
fi

if [[ "$action" == "delete" ]]; then
echo "deleting .linux-system-hud/ "
rm -rf /home/phil/.linux-system-hud
fi


echo "done"
