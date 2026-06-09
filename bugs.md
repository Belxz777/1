
запуск xray

xray -test -config /etc/xray/config.json

sudo systemctl restart xray


не стартует по дефолту arch 




была проблема десинхронизации xray и бд 


также возникают ошибки если drizzle конфига нет 

если генерировать через drizzle kit то в нужно cd в папку src

в корне не работает  после этого все ок