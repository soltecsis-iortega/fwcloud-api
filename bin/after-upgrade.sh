#!/bin/sh
#############################################
##                                         ##
##  FWCloud.net                            ##
##  https://fwcloud.net                    ##
##  info@fwcloud.net                       ##
##                                         ##
##  Developed by SOLTECSIS, S.L.           ##
##  https://soltecsis.com                  ##
##  info@soltecsis.com                     ##
##                                         ##
#############################################

cd /opt/fwcloud/api
node fwcli migration:run >/dev/null
node fwcli migration:data >/dev/null
node fwcli standard:services:add >/dev/null

# Make sure that all files are owned by the fwcloud user and group.
cd /opt/fwcloud
chown -R fwcloud:fwcloud api && chmod 750 api

# Restart FWCloud-Websrv service.
systemctl restart fwcloud-api

exit 0
